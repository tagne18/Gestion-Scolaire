const fs = require('fs');
const XLSX = require('xlsx');
const { getDatabase } = require('../database/db');
const { genererMatricule } = require('../utils/matricule');

/**
 * Service d'import d'élèves depuis un fichier SQL ou Excel
 */
const sqlImportService = {
  normalizeLabel(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9]/g, '');
  },

  trouverClasse(classes, nomClasse, nomSection) {
    const classeNorm = this.normalizeLabel(nomClasse);
    const sectionNorm = this.normalizeLabel(nomSection);

    // Première tentative : correspondance exacte normalisée
    let match = classes.find((classe) => {
      const memeSection = !sectionNorm || this.normalizeLabel(classe.section_nom) === sectionNorm;
      const nomDb = this.normalizeLabel(classe.nom);
      return memeSection && nomDb === classeNorm;
    });

    if (match) return match;

    // Deuxième tentative : correspondance partielle (contient)
    match = classes.find((classe) => {
      const memeSection = !sectionNorm || this.normalizeLabel(classe.section_nom) === sectionNorm;
      const nomDb = this.normalizeLabel(classe.nom);
      return memeSection && (nomDb.includes(classeNorm) || classeNorm.includes(nomDb));
    });

    if (match) return match;

    // Troisième tentative : ignoré la section si pas trouvée
    match = classes.find((classe) => {
      const nomDb = this.normalizeLabel(classe.nom);
      return nomDb === classeNorm;
    });

    return match || null;
  },

  creerClasseSiNexistePas(db, nomClasse, nomSection) {
    try {
      // Trouver ou créer la section
      let section = db.prepare(`
        SELECT id FROM sections WHERE LOWER(nom) = LOWER(?)
      `).get(nomSection || 'Francophone');

      if (!section) {
        const sectionResult = db.prepare(`
          INSERT INTO sections (nom) VALUES (?)
        `).run(nomSection || 'Francophone');
        section = { id: sectionResult.lastInsertRowid };
      }

      // Vérifier si la classe existe déjà
      let classe = db.prepare(`
        SELECT c.id, c.nom, c.section_id, s.nom as section_nom
        FROM classes c
        JOIN sections s ON c.section_id = s.id
        WHERE LOWER(c.nom) = LOWER(?) AND c.section_id = ?
      `).get(nomClasse, section.id);

      if (!classe) {
        // Déterminer le niveau automatiquement
        let niveau = 'Primaire';
        const nomClasseLower = nomClasse.toLowerCase();
        if (nomClasseLower.includes('nursery') || nomClasseLower.includes('maternelle') || nomClasseLower.includes('kindergarten')) {
          niveau = 'Maternelle';
        }

        const classeResult = db.prepare(`
          INSERT INTO classes (nom, niveau, section_id) VALUES (?, ?, ?)
        `).run(nomClasse, niveau, section.id);
        
        classe = db.prepare(`
          SELECT c.id, c.nom, c.section_id, s.nom as section_nom
          FROM classes c
          JOIN sections s ON c.section_id = s.id
          WHERE c.id = ?
        `).get(classeResult.lastInsertRowid);
      }

      return classe;
    } catch (error) {
      console.error('Erreur lors de la création de la classe:', error);
      return null;
    }
  },

  getAnneeCible(db, anneeLibelle = '2025/2026') {
    const parLibelle = db.prepare(`
      SELECT * FROM annees_scolaires WHERE libelle = ?
    `).get(anneeLibelle);

    if (parLibelle) {
      return parLibelle;
    }

    return db.prepare(`
      SELECT * FROM annees_scolaires WHERE active = 1
    `).get();
  },
  /**
   * Parse un fichier SQL pour extraire les noms des élèves
   * @param {string} filePath - Chemin du fichier SQL
   * @returns {Object} - Résultat du parsing
   */
  parseSqlFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const students = [];

      // Chercher les INSERT INTO `inscriptions`
      const insertRegex = /INSERT INTO `inscriptions`[\s\S]*?VALUES\s*([\s\S]*?);/g;
      const matches = content.match(insertRegex);

      if (!matches) {
        return { success: false, error: 'Aucune donnée d\'inscription trouvée dans le fichier' };
      }

      // Parser chaque ligne de VALUES et extraire aussi le nom de la classe
      matches.forEach(match => {
        const valuesRegex = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']+)',\s*'([^']+)',/g;
        let valueMatch;
        
        while ((valueMatch = valuesRegex.exec(match)) !== null) {
          const [, id, nom, prenom, dateNaissance, section, idClasse] = valueMatch;
          
          // Récupérer le nom de la classe depuis la table classes dans le même fichier
          const classeName = this.extractClassName(content, idClasse);
          
          // Ignorer les doublons basés sur nom+prenom
          const isDuplicate = students.some(s => 
            s.nom.toLowerCase() === nom.toLowerCase() && 
            s.prenom.toLowerCase() === prenom.toLowerCase()
          );
          
          if (!isDuplicate) {
            students.push({
              nom: nom.trim(),
              prenom: prenom.trim(),
              date_naissance: dateNaissance || null,
              section: section || null,
              classe_origine: classeName || null
            });
          }
        }
      });

      return { success: true, data: students };
    } catch (error) {
      console.error('Erreur lors du parsing du fichier SQL:', error);
      return { success: false, error: 'Erreur lors du parsing du fichier SQL' };
    }
  },

  /**
   * Extrait le nom de la classe depuis le fichier SQL
   * @param {string} content - Contenu du fichier SQL
   * @param {string} idClasse - ID de la classe
   * @returns {string|null} - Nom de la classe ou null
   */
  extractClassName(content, idClasse) {
    try {
      const classRegex = new RegExp(`INSERT INTO \`classes\`[\\s\\S]*?VALUES\\s*([\\s\\S]*?);`, 'g');
      const classMatch = content.match(classRegex);
      
      if (!classMatch) return null;
      
      const classValuesRegex = new RegExp(`\\(${idClasse},\\s*'([^']+)'`, 'g');
      const classValueMatch = classValuesRegex.exec(classMatch[0]);
      
      if (classValueMatch) {
        return classValueMatch[1].trim();
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de l\'extraction du nom de classe:', error);
      return null;
    }
  },

  /**
   * Parse un fichier Excel (colonnes Nom, Prénom, Section, Classe)
   */
  parseExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { success: false, error: 'Le fichier Excel ne contient aucune feuille' };
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      const students = [];

      console.log('Colonnes trouvées dans le fichier Excel:', Object.keys(rows[0] || {}));
      console.log('Première ligne de données:', rows[0]);

      rows.forEach((row) => {
        // Détection plus flexible des colonnes
        const nom = String(row.Nom || row.nom || row.NOM || row['Name'] || row.name || '').trim();
        const prenom = String(row.Prenom || row['Prénom'] || row.prenom || row.PRENOM || row['Surname'] || row.surname || '').trim();
        
        // Détection flexible de la section
        let section = '';
        for (const key of Object.keys(row)) {
          if (key.toLowerCase().includes('section') || key.toLowerCase().includes('sec')) {
            section = String(row[key]).trim();
            break;
          }
        }
        
        // Détection flexible de la classe
        let classe = '';
        for (const key of Object.keys(row)) {
          if (key.toLowerCase().includes('classe') || key.toLowerCase().includes('class') || key.toLowerCase().includes('grade')) {
            classe = String(row[key]).trim();
            break;
          }
        }
        
        const dateNaissance = row['Date de naissance'] || row.date_naissance || row['Date of Birth'] || row.dob || null;

        if (!nom || !prenom) {
          return;
        }

        const isDuplicate = students.some((s) =>
          s.nom.toLowerCase() === nom.toLowerCase() &&
          s.prenom.toLowerCase() === prenom.toLowerCase()
        );

        if (!isDuplicate) {
          students.push({
            nom,
            prenom,
            date_naissance: dateNaissance || null,
            section: section || null,
            classe_origine: classe || null
          });
        }
      });

      if (students.length === 0) {
        return { success: false, error: 'Aucun élève trouvé dans le fichier Excel (colonnes attendues : Nom, Prénom, Section, Classe)' };
      }

      console.log('Étudiants parsés:', students.slice(0, 3)); // Afficher les 3 premiers pour débogage

      return { success: true, data: students };
    } catch (error) {
      console.error('Erreur lors du parsing du fichier Excel:', error);
      return { success: false, error: 'Erreur lors du parsing du fichier Excel' };
    }
  },

  /**
   * Importe les élèves et les inscrit dans l'année 2025/2026 (ou l'année active)
   */
  importStudents(students, anneeLibelle = '2025/2026') {
    try {
      const db = getDatabase();
      let imported = 0;
      let skipped = 0;
      let inscrits = 0;
      const errors = [];

      const anneeCible = this.getAnneeCible(db, anneeLibelle);

      if (!anneeCible) {
        return { success: false, error: `Année scolaire ${anneeLibelle} introuvable. Créez-la d'abord.` };
      }

      const classes = db.prepare(`
        SELECT c.id, c.nom, c.section_id, s.nom as section_nom
        FROM classes c
        JOIN sections s ON c.section_id = s.id
      `).all();

      const insertEleve = db.prepare(`
        INSERT INTO eleves (matricule, nom, prenom, date_naissance, sexe, date_creation)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const insertInscription = db.prepare(`
        INSERT INTO inscriptions (
          eleve_id, annee_scolaire_id, classe_id, section_id,
          montant_pension, reduction, motif_reduction, statut, date_inscription, redoublement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTranche = db.prepare(`
        INSERT INTO tranches (inscription_id, numero, libelle, montant_attendu, date_limite)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertImport = db.prepare(`
        INSERT INTO eleves_import (eleve_id, classe_origine, date_import)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      const dateInscription = new Date().toISOString().split('T')[0];

      const importerUn = db.transaction((student) => {
        let eleve = db.prepare(`
          SELECT id FROM eleves
          WHERE LOWER(nom) = LOWER(?) AND LOWER(prenom) = LOWER(?)
        `).get(student.nom, student.prenom);

        let nouvelEleve = false;

        if (!eleve) {
          const sectionMatricule = student.section || 'Francophone';
          const matricule = genererMatricule(sectionMatricule);
          const result = insertEleve.run(
            matricule,
            student.nom,
            student.prenom,
            student.date_naissance || null,
            null
          );
          eleve = { id: result.lastInsertRowid };
          nouvelEleve = true;

          if (student.classe_origine) {
            try {
              insertImport.run(eleve.id, student.classe_origine);
            } catch (e) {
              // table optionnelle
            }
          }
        }

        const inscriptionExistante = db.prepare(`
          SELECT id FROM inscriptions
          WHERE eleve_id = ? AND annee_scolaire_id = ?
        `).get(eleve.id, anneeCible.id);

        if (inscriptionExistante) {
          return { nouvelEleve, inscrit: false, skippedInscription: true };
        }

        let classeMatch = this.trouverClasse(classes, student.classe_origine, student.section);
        
        // Si la classe n'existe pas, la créer automatiquement
        if (!classeMatch && student.classe_origine) {
          classeMatch = this.creerClasseSiNexistePas(db, student.classe_origine, student.section);
          
          // Recharger la liste des classes après création
          if (classeMatch) {
            classes.push(classeMatch);
          }
        }
        
        // Si toujours pas de classe (données manquantes), créer une classe par défaut
        if (!classeMatch) {
          const defaultClasse = 'Classe par défaut';
          const defaultSection = student.section || 'Francophone';
          classeMatch = this.creerClasseSiNexistePas(db, defaultClasse, defaultSection);
          
          if (classeMatch) {
            classes.push(classeMatch);
          }
        }
        
        if (!classeMatch) {
          const err = new Error(`Impossible de créer une classe pour l'étudiant. Données: Classe="${student.classe_origine}", Section="${student.section}"`);
          err.partial = true;
          err.nouvelEleve = nouvelEleve;
          err.studentInfo = student;
          throw err;
        }

        const tarifs = db.prepare(`
          SELECT * FROM tarifs_classe
          WHERE classe_id = ? AND annee_scolaire_id = ?
        `).get(classeMatch.id, anneeCible.id);

        const montantPension = tarifs ? tarifs.montant_pension_annuel : 0;

        const inscriptionResult = insertInscription.run(
          eleve.id,
          anneeCible.id,
          classeMatch.id,
          classeMatch.section_id,
          montantPension,
          0,
          null,
          'active',
          dateInscription,
          'premiere_inscription'
        );

        if (tarifs) {
          [
            { numero: 1, libelle: 'Tranche 1', montant: tarifs.tranche_1 || 0, date_limite: tarifs.date_limite_tranche_1 || null },
            { numero: 2, libelle: 'Tranche 2', montant: tarifs.tranche_2 || 0, date_limite: tarifs.date_limite_tranche_2 || null }
          ].forEach((tranche) => {
            insertTranche.run(
              inscriptionResult.lastInsertRowid,
              tranche.numero,
              tranche.libelle,
              tranche.montant,
              tranche.date_limite
            );
          });
        }

        return { nouvelEleve, inscrit: true, skippedInscription: false };
      });

      students.forEach((student) => {
        try {
          const result = importerUn(student);
          if (result.nouvelEleve) {
            imported++;
          } else {
            skipped++;
          }
          if (result.inscrit) {
            inscrits++;
          }
        } catch (error) {
          if (error.nouvelEleve) {
            imported++;
          }
          errors.push({
            student: `${student.nom} ${student.prenom}`,
            error: error.message,
            classe: student.classe_origine,
            section: student.section
          });
        }
      });

      return {
        success: true,
        imported,
        skipped,
        inscrits,
        reinscrits: inscrits,
        errors,
        total: students.length,
        annee: anneeCible.libelle,
        message: `${imported} élève(s) créé(s), ${inscrits} inscription(s) en ${anneeCible.libelle}. ${skipped} élève(s) déjà existant(s).`
      };
    } catch (error) {
      console.error('Erreur lors de l\'import des élèves:', error);
      return { success: false, error: 'Erreur lors de l\'import des élèves' };
    }
  }
};

module.exports = sqlImportService;
