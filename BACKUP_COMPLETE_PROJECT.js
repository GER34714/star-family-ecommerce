// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP COMPLETO DEL PROYECTO STAR FAMILY E-COMMERCE
// Este script crea un backup completo de TODO el proyecto: código, configuración, etc.
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ProjectBackup {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupInfo = {
      timestamp: this.timestamp,
      projectPath: projectPath,
      projectName: 'star-family-ecommerce',
      version: '1.0.0',
      files: {},
      directories: {},
      totalFiles: 0,
      totalSize: 0,
      excludedPaths: [
        'node_modules',
        '.git',
        'build',
        'dist',
        '.next',
        'coverage',
        '.nyc_output',
        '.cache',
        'temp',
        'tmp'
      ],
      excludedFiles: [
        '.DS_Store',
        'Thumbs.db',
        '*.log',
        '*.tmp',
        '.env.local',
        '.env.development.local',
        '.env.test.local',
        '.env.production.local'
      ]
    };
  }

  // Verificar si un archivo/directorio debe ser excluido
  shouldExclude(filePath) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectPath, filePath);
    
    // Excluir directorios
    for (const excludedDir of this.backupInfo.excludedPaths) {
      if (relativePath.includes(excludedDir)) {
        return true;
      }
    }
    
    // Excluir archivos específicos
    for (const excludedFile of this.backupInfo.excludedFiles) {
      if (fileName === excludedFile || fileName.match(excludedFile.replace('*', '.*'))) {
        return true;
      }
    }
    
    return false;
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

  // Obtener información de un archivo
  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(this.projectPath, filePath);
      
      return {
        path: relativePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        isDirectory: stats.isDirectory(),
        hash: stats.isFile() ? this.calculateFileHash(filePath) : null,
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      return null;
    }
  }

  // Escanear directorio recursivamente
  scanDirectory(dirPath, currentDepth = 0) {
    if (currentDepth > 10) { // Limitar profundidad para evitar bucles
      return;
    }

    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        
        if (this.shouldExclude(itemPath)) {
          continue;
        }
        
        const fileInfo = this.getFileInfo(itemPath);
        if (!fileInfo) {
          continue;
        }
        
        if (fileInfo.isDirectory) {
          this.backupInfo.directories[fileInfo.path] = fileInfo;
          this.scanDirectory(itemPath, currentDepth + 1);
        } else {
          this.backupInfo.files[fileInfo.path] = fileInfo;
          this.backupInfo.totalFiles++;
          this.backupInfo.totalSize += fileInfo.size;
        }
      }
    } catch (error) {
      console.error(`Error escaneando directorio ${dirPath}:`, error.message);
    }
  }

  // Leer contenido de archivos de texto
  readTextFiles() {
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.sql', '.html', '.css', '.scss', '.less', '.xml', '.yml', '.yaml', '.env'];
    const maxFileSize = 1024 * 1024; // 1MB máximo para archivos de texto
    
    for (const [filePath, fileInfo] of Object.entries(this.backupInfo.files)) {
      const ext = path.extname(filePath).toLowerCase();
      
      if (textExtensions.includes(ext) && fileInfo.size < maxFileSize) {
        try {
          const fullPath = path.join(this.projectPath, filePath);
          const content = fs.readFileSync(fullPath, 'utf8');
          fileInfo.content = content;
        } catch (error) {
          fileInfo.content = `Error reading file: ${error.message}`;
        }
      }
    }
  }

  // Obtener información del package.json
  getPackageInfo() {
    try {
      const packagePath = path.join(this.projectPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageContent = fs.readFileSync(packagePath, 'utf8');
        this.backupInfo.packageInfo = JSON.parse(packageContent);
      }
    } catch (error) {
      console.error('Error leyendo package.json:', error.message);
    }
  }

  // Obtener información de Git
  getGitInfo() {
    try {
      const gitPath = path.join(this.projectPath, '.git');
      if (fs.existsSync(gitPath)) {
        // Obtener el commit actual
        const currentCommit = execSync('git rev-parse HEAD', { 
          cwd: this.projectPath, 
          encoding: 'utf8' 
        }).trim();
        
        // Obtener el branch actual
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
          cwd: this.projectPath, 
          encoding: 'utf8' 
        }).trim();
        
        // Obtener el último tag
        let latestTag = '';
        try {
          latestTag = execSync('git describe --tags --abbrev=0', { 
            cwd: this.projectPath, 
            encoding: 'utf8' 
          }).trim();
        } catch (e) {
          latestTag = 'No tags found';
        }
        
        // Obtener status de git
        const gitStatus = execSync('git status --porcelain', { 
          cwd: this.projectPath, 
          encoding: 'utf8' 
        }).trim();
        
        this.backupInfo.gitInfo = {
          currentCommit,
          currentBranch,
          latestTag,
          isClean: gitStatus.length === 0,
          status: gitStatus.split('\n').filter(line => line.length > 0)
        };
      }
    } catch (error) {
      console.error('Error obteniendo información de Git:', error.message);
    }
  }

  // Obtener información de variables de entorno
  getEnvInfo() {
    const envFiles = ['.env', '.env.production', '.env.development'];
    this.backupInfo.envFiles = {};
    
    for (const envFile of envFiles) {
      const envPath = path.join(this.projectPath, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          const envVars = {};
          
          envLines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              envVars[key.trim()] = valueParts.join('=').trim();
            }
          });
          
          this.backupInfo.envFiles[envFile] = {
            variables: Object.keys(envVars),
            hasSensitiveData: Object.keys(envVars).some(key => 
              key.toLowerCase().includes('secret') || 
              key.toLowerCase().includes('key') || 
              key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('token')
            ),
            content: envContent.replace(/=.+$/, '=***HIDDEN***') // Ocultar valores
          };
        } catch (error) {
          console.error(`Error leyendo ${envFile}:`, error.message);
        }
      }
    }
  }

  // Crear backup completo
  async createBackup() {
    console.log('🔄 Iniciando backup completo del proyecto...');
    console.log(`📁 Ruta del proyecto: ${this.projectPath}`);
    
    // Escanear estructura del proyecto
    console.log('📋 Escaneando estructura del proyecto...');
    this.scanDirectory(this.projectPath);
    
    // Leer contenido de archivos de texto
    console.log('📖 Leyendo contenido de archivos...');
    this.readTextFiles();
    
    // Obtener información adicional
    console.log('📦 Obteniendo información del proyecto...');
    this.getPackageInfo();
    this.getGitInfo();
    this.getEnvInfo();
    
    // Generar archivos de backup
    console.log('💾 Generando archivos de backup...');
    
    // 1. Backup JSON completo
    const jsonBackupName = `STAR_FAMILY_COMPLETE_BACKUP_${this.timestamp}.json`;
    const jsonBackupPath = path.join(this.projectPath, jsonBackupName);
    fs.writeFileSync(jsonBackupPath, JSON.stringify(this.backupInfo, null, 2));
    
    // 2. Backup comprimido
    const tarBackupName = `STAR_FAMILY_COMPLETE_BACKUP_${this.timestamp}.tar.gz`;
    const tarBackupPath = path.join(this.projectPath, tarBackupName);
    
    try {
      // Crear tar.gz excluyendo directorios pesados
      const excludeArgs = this.backupInfo.excludedPaths.map(dir => `--exclude='${dir}'`).join(' ');
      execSync(`tar -czf "${tarBackupPath}" ${excludeArgs} --exclude='*.tar.gz' --exclude='*.zip' .`, {
        cwd: this.projectPath,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Error creando archivo comprimido:', error.message);
    }
    
    // 3. Backup de solo código fuente
    const sourceBackupName = `STAR_FAMILY_SOURCE_BACKUP_${this.timestamp}.tar.gz`;
    const sourceBackupPath = path.join(this.projectPath, sourceBackupName);
    
    try {
      execSync(`tar -czf "${sourceBackupPath}" --exclude='node_modules' --exclude='.git' --exclude='build' --exclude='dist' --exclude='*.tar.gz' --exclude='*.zip' src/ public/ scripts/ package.json package-lock.json *.md *.sql *.js *.json`, {
        cwd: this.projectPath,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Error creando backup de código fuente:', error.message);
    }
    
    // 4. Generar reporte
    this.generateReport();
    
    console.log('\n✅ Backup completado exitosamente');
    console.log('📁 Archivos generados:');
    console.log(`   📄 JSON completo: ${jsonBackupName}`);
    console.log(`   📦 Proyecto completo: ${tarBackupName}`);
    console.log(`   📦 Código fuente: ${sourceBackupName}`);
    console.log(`📊 Estadísticas:`);
    console.log(`   📁 Total directorios: ${Object.keys(this.backupInfo.directories).length}`);
    console.log(`   📄 Total archivos: ${this.backupInfo.totalFiles}`);
    console.log(`   💾 Tamaño total: ${(this.backupInfo.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      jsonBackup: jsonBackupPath,
      tarBackup: tarBackupPath,
      sourceBackup: sourceBackupPath,
      backupInfo: this.backupInfo
    };
  }

  // Generar reporte del backup
  generateReport() {
    const reportName = `BACKUP_REPORT_${this.timestamp}.md`;
    const reportPath = path.join(this.projectPath, reportName);
    
    let report = `# 📋 Reporte de Backup Completo\n\n`;
    report += `**Fecha:** ${new Date().toLocaleString()}\n`;
    report += `**Proyecto:** ${this.backupInfo.projectName}\n`;
    report += `**Versión:** ${this.backupInfo.version}\n\n`;
    
    // Estadísticas
    report += `## 📊 Estadísticas del Backup\n\n`;
    report += `- **Total archivos:** ${this.backupInfo.totalFiles}\n`;
    report += `- **Total directorios:** ${Object.keys(this.backupInfo.directories).length}\n`;
    report += `- **Tamaño total:** ${(this.backupInfo.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;
    
    // Información de Git
    if (this.backupInfo.gitInfo) {
      report += `## 🌿 Información de Git\n\n`;
      report += `- **Branch actual:** ${this.backupInfo.gitInfo.currentBranch}\n`;
      report += `- **Commit actual:** ${this.backupInfo.gitInfo.currentCommit}\n`;
      report += `- **Último tag:** ${this.backupInfo.gitInfo.latestTag}\n`;
      report += `- **Estado limpio:** ${this.backupInfo.gitInfo.isClean ? 'Sí' : 'No'}\n\n`;
    }
    
    // Archivos principales
    report += `## 📄 Archivos Principales\n\n`;
    const mainFiles = Object.keys(this.backupInfo.files).filter(file => 
      file.includes('package.json') || 
      file.includes('App.jsx') || 
      file.includes('README.md') ||
      file.endsWith('.sql')
    );
    
    mainFiles.forEach(file => {
      const fileInfo = this.backupInfo.files[file];
      report += `- **${file}** (${(fileInfo.size / 1024).toFixed(2)} KB)\n`;
    });
    
    // Variables de entorno
    if (Object.keys(this.backupInfo.envFiles).length > 0) {
      report += `## 🔧 Variables de Entorno\n\n`;
      Object.entries(this.backupInfo.envFiles).forEach(([fileName, envInfo]) => {
        report += `- **${fileName}**: ${envInfo.variables.length} variables`;
        if (envInfo.hasSensitiveData) {
          report += ` ⚠️ *Contiene datos sensibles*`;
        }
        report += `\n`;
      });
      report += `\n`;
    }
    
    // Estructura de directorios
    report += `## 📁 Estructura de Directorios\n\n`;
    Object.keys(this.backupInfo.directories).forEach(dir => {
      report += `- ${dir}/\n`;
    });
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Reporte generado: ${reportName}`);
  }
}

// Función principal
async function createCompleteProjectBackup(projectPath = process.cwd()) {
  const backup = new ProjectBackup(projectPath);
  return await backup.createBackup();
}

// Ejecutar backup
if (require.main === module) {
  (async () => {
    try {
      const projectPath = process.argv[2] || process.cwd();
      const result = await createCompleteProjectBackup(projectPath);
      console.log('\n🎉 Backup completado exitosamente');
    } catch (error) {
      console.error('💥 Error durante el backup:', error);
      process.exit(1);
    }
  })();
}

module.exports = { ProjectBackup, createCompleteProjectBackup };
