// ═══════════════════════════════════════════════════════════════════════════════
// RESTAURACIÓN COMPLETA DEL PROYECTO STAR FAMILY E-COMMERCE
// Este script restaura TODO el proyecto desde un backup completo
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ProjectRestore {
  constructor(backupPath, targetPath) {
    this.backupPath = backupPath;
    this.targetPath = targetPath;
    this.backupInfo = null;
    this.restoreReport = {
      timestamp: new Date().toISOString(),
      backupPath: backupPath,
      targetPath: targetPath,
      restoredFiles: [],
      errors: [],
      warnings: [],
      skippedFiles: []
    };
  }

  // Cargar información del backup
  loadBackupInfo() {
    if (!fs.existsSync(this.backupPath)) {
      throw new Error(`Archivo de backup no encontrado: ${this.backupPath}`);
    }

    try {
      const backupContent = fs.readFileSync(this.backupPath, 'utf8');
      this.backupInfo = JSON.parse(backupContent);
      console.log(`📋 Backup cargado: ${this.backupInfo.timestamp}`);
      console.log(`📁 Proyecto: ${this.backupInfo.projectName}`);
      console.log(`📄 Total archivos: ${this.backupInfo.totalFiles}`);
    } catch (error) {
      throw new Error(`Error cargando backup: ${error.message}`);
    }
  }

  // Verificar integridad de archivos
  verifyFileIntegrity(filePath, expectedHash) {
    if (!expectedHash) return true;
    
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  // Crear directorio si no existe
  ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Error creando directorio ${dirPath}:`, error.message);
    }
  }

  // Restaurar un archivo individual
  restoreFile(filePath, fileInfo) {
    const fullPath = path.join(this.targetPath, filePath);
    const dirPath = path.dirname(fullPath);
    
    try {
      // Crear directorio si no existe
      this.ensureDirectoryExists(dirPath);
      
      // Verificar si el archivo ya existe
      if (fs.existsSync(fullPath)) {
        const existingHash = this.calculateFileHash(fullPath);
        if (existingHash === fileInfo.hash) {
          this.restoreReport.skippedFiles.push({
            path: filePath,
            reason: 'El archivo ya existe y es idéntico'
          });
          return true;
        }
        
        // Hacer backup del archivo existente
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        fs.copyFileSync(fullPath, backupPath);
        this.restoreReport.warnings.push({
          path: filePath,
          message: `Archivo existente respaldado en: ${backupPath}`
        });
      }
      
      // Restaurar contenido del archivo
      if (fileInfo.content !== undefined) {
        fs.writeFileSync(fullPath, fileInfo.content, 'utf8');
      } else {
        this.restoreReport.warnings.push({
          path: filePath,
          message: 'Contenido no disponible en el backup'
        });
        return false;
      }
      
      // Verificar integridad
      if (fileInfo.hash && !this.verifyFileIntegrity(fullPath, fileInfo.hash)) {
        this.restoreReport.errors.push({
          path: filePath,
          message: 'Error de integridad: el hash no coincide'
        });
        return false;
      }
      
      // Restaurar permisos si es posible
      if (fileInfo.permissions) {
        try {
          fs.chmodSync(fullPath, parseInt(fileInfo.permissions, 8));
        } catch (error) {
          this.restoreReport.warnings.push({
            path: filePath,
            message: `No se pudieron restaurar permisos: ${error.message}`
          });
        }
      }
      
      this.restoreReport.restoredFiles.push({
        path: filePath,
        size: fileInfo.size,
        hash: fileInfo.hash
      });
      
      return true;
      
    } catch (error) {
      this.restoreReport.errors.push({
        path: filePath,
        message: `Error restaurando archivo: ${error.message}`
      });
      return false;
    }
  }

  // Calcular hash de un archivo
  calculateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      return null;
    }
  }

  // Restaurar desde JSON
  async restoreFromJSON() {
    console.log('🔄 Iniciando restauración desde JSON...');
    
    if (!this.backupInfo) {
      this.loadBackupInfo();
    }
    
    // Restaurar archivos
    console.log('📄 Restaurando archivos...');
    for (const [filePath, fileInfo] of Object.entries(this.backupInfo.files)) {
      this.restoreFile(filePath, fileInfo);
    }
    
    // Restaurar estructura de directorios
    console.log('📁 Restaurando estructura de directorios...');
    for (const [dirPath, dirInfo] of Object.entries(this.backupInfo.directories)) {
      const fullPath = path.join(this.targetPath, dirPath);
      this.ensureDirectoryExists(fullPath);
    }
    
    return this.generateReport();
  }

  // Restaurar desde archivo comprimido
  async restoreFromTar() {
    console.log('🔄 Iniciando restauración desde archivo comprimido...');
    
    try {
      // Verificar si el directorio target existe
      if (!fs.existsSync(this.targetPath)) {
        fs.mkdirSync(this.targetPath, { recursive: true });
      }
      
      // Extraer archivo comprimido
      execSync(`tar -xzf "${this.backupPath}" -C "${this.targetPath}"`, {
        stdio: 'inherit'
      });
      
      console.log('✅ Archivo comprimido extraído exitosamente');
      
      this.restoreReport.restoredFiles.push({
        path: 'Proyecto completo',
        message: 'Restaurado desde archivo comprimido'
      });
      
      return this.generateReport();
      
    } catch (error) {
      this.restoreReport.errors.push({
        path: 'Archivo comprimido',
        message: `Error extrayendo: ${error.message}`
      });
      throw error;
    }
  }

  // Restaurar dependencias
  async restoreDependencies() {
    console.log('📦 Restaurando dependencias...');
    
    const packageJsonPath = path.join(this.targetPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        execSync('npm install', {
          cwd: this.targetPath,
          stdio: 'inherit'
        });
        
        this.restoreReport.restoredFiles.push({
          path: 'node_modules',
          message: 'Dependencias instaladas'
        });
        
      } catch (error) {
        this.restoreReport.errors.push({
          path: 'node_modules',
          message: `Error instalando dependencias: ${error.message}`
        });
      }
    } else {
      this.restoreReport.warnings.push({
        path: 'package.json',
        message: 'No se encontró package.json'
      });
    }
  }

  // Restaurar información de Git
  async restoreGitInfo() {
    console.log('🌿 Analizando información de Git...');
    
    if (this.backupInfo.gitInfo) {
      const gitPath = path.join(this.targetPath, '.git');
      
      if (fs.existsSync(gitPath)) {
        try {
          // Obtener información actual del repositorio
          const currentCommit = execSync('git rev-parse HEAD', {
            cwd: this.targetPath,
            encoding: 'utf8'
          }).trim();
          
          if (currentCommit !== this.backupInfo.gitInfo.currentCommit) {
            this.restoreReport.warnings.push({
              path: '.git',
              message: `El commit actual (${currentCommit}) difiere del backup (${this.backupInfo.gitInfo.currentCommit})`
            });
          }
          
        } catch (error) {
          this.restoreReport.warnings.push({
            path: '.git',
            message: `Error verificando información de Git: ${error.message}`
          });
        }
      } else {
        this.restoreReport.warnings.push({
          path: '.git',
          message: 'No se encontró repositorio Git'
        });
      }
    }
  }

  // Generar reporte de restauración
  generateReport() {
    const reportName = `RESTORE_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    const reportPath = path.join(this.targetPath, reportName);
    
    let report = `# 📋 Reporte de Restauración Completa\n\n`;
    report += `**Fecha:** ${new Date().toLocaleString()}\n`;
    report += `**Backup:** ${this.backupPath}\n`;
    report += `**Destino:** ${this.targetPath}\n\n`;
    
    // Resumen
    report += `## 📊 Resumen de Restauración\n\n`;
    report += `- **Archivos restaurados:** ${this.restoreReport.restoredFiles.length}\n`;
    report += `- **Archivos omitidos:** ${this.restoreReport.skippedFiles.length}\n`;
    report += `- **Advertencias:** ${this.restoreReport.warnings.length}\n`;
    report += `- **Errores:** ${this.restoreReport.errors.length}\n\n`;
    
    // Archivos restaurados
    if (this.restoreReport.restoredFiles.length > 0) {
      report += `## ✅ Archivos Restaurados\n\n`;
      this.restoreReport.restoredFiles.forEach(file => {
        report += `- **${file.path}**`;
        if (file.size) report += ` (${(file.size / 1024).toFixed(2)} KB)`;
        if (file.message) report += ` - ${file.message}`;
        report += `\n`;
      });
      report += `\n`;
    }
    
    // Archivos omitidos
    if (this.restoreReport.skippedFiles.length > 0) {
      report += `## ⏭️ Archivos Omitidos\n\n`;
      this.restoreReport.skippedFiles.forEach(file => {
        report += `- **${file.path}** - ${file.reason}\n`;
      });
      report += `\n`;
    }
    
    // Advertencias
    if (this.restoreReport.warnings.length > 0) {
      report += `## ⚠️ Advertencias\n\n`;
      this.restoreReport.warnings.forEach(warning => {
        report += `- **${warning.path}** - ${warning.message}\n`;
      });
      report += `\n`;
    }
    
    // Errores
    if (this.restoreReport.errors.length > 0) {
      report += `## ❌ Errores\n\n`;
      this.restoreReport.errors.forEach(error => {
        report += `- **${error.path}** - ${error.message}\n`;
      });
      report += `\n`;
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Reporte de restauración generado: ${reportName}`);
    
    return reportPath;
  }

  // Ejecutar restauración completa
  async restore() {
    console.log('🔄 Iniciando restauración completa del proyecto...');
    
    try {
      // Determinar tipo de backup
      if (this.backupPath.endsWith('.json')) {
        await this.restoreFromJSON();
      } else if (this.backupPath.endsWith('.tar.gz')) {
        await this.restoreFromTar();
      } else {
        throw new Error('Tipo de archivo no soportado. Use .json o .tar.gz');
      }
      
      // Restaurar dependencias
      await this.restoreDependencies();
      
      // Analizar información de Git
      await this.restoreGitInfo();
      
      console.log('\n✅ Restauración completada');
      console.log(`📊 Archivos restaurados: ${this.restoreReport.restoredFiles.length}`);
      console.log(`⚠️ Advertencias: ${this.restoreReport.warnings.length}`);
      console.log(`❌ Errores: ${this.restoreReport.errors.length}`);
      
      return this.restoreReport;
      
    } catch (error) {
      console.error('💥 Error durante la restauración:', error);
      throw error;
    }
  }
}

// Función principal
async function restoreProject(backupPath, targetPath = process.cwd()) {
  const restore = new ProjectRestore(backupPath, targetPath);
  return await restore.restore();
}

// Listar backups disponibles
function listBackups(projectPath = process.cwd()) {
  const files = fs.readdirSync(projectPath);
  
  const backups = files.filter(file => 
    (file.startsWith('STAR_FAMILY_COMPLETE_BACKUP_') && file.endsWith('.json')) ||
    (file.startsWith('STAR_FAMILY_COMPLETE_BACKUP_') && file.endsWith('.tar.gz')) ||
    (file.startsWith('STAR_FAMILY_SOURCE_BACKUP_') && file.endsWith('.tar.gz'))
  );
  
  console.log('📁 Backups disponibles:');
  if (backups.length === 0) {
    console.log('   No se encontraron backups');
  } else {
    backups.forEach(backup => {
      const stats = fs.statSync(path.join(projectPath, backup));
      const type = backup.endsWith('.json') ? 'JSON' : 'TAR.GZ';
      console.log(`   ${backup} (${type}, ${(stats.size / 1024 / 1024).toFixed(2)} MB, ${stats.mtime.toLocaleDateString()})`);
    });
  }
  
  return backups;
}

// Ejecutar restauración
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    listBackups();
    process.exit(0);
  }
  
  if (args.length === 0) {
    console.log('Uso:');
    console.log('  node RESTORE_COMPLETE_PROJECT.js <archivo_backup> [directorio_destino]');
    console.log('  node RESTORE_COMPLETE_PROJECT.js --list');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node RESTORE_COMPLETE_PROJECT.js STAR_FAMILY_COMPLETE_BACKUP_2026-05-05T17-52-21-206Z.json');
    console.log('  node RESTORE_COMPLETE_PROJECT.js STAR_FAMILY_COMPLETE_BACKUP_2026-05-05T17-52-21-206Z.tar.gz ./restored-project');
    process.exit(1);
  }
  
  const backupPath = args[0];
  const targetPath = args[1] || process.cwd();
  
  (async () => {
    try {
      await restoreProject(backupPath, targetPath);
      console.log('\n🎉 Restauración completada exitosamente');
    } catch (error) {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    }
  })();
}

module.exports = { ProjectRestore, restoreProject, listBackups };
