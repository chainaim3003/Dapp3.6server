import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  executionTime: string;
}

export interface ZKExecutorConfig {
  stdioPath: string;
  stdioBuildPath: string;
  timeout: number;
}

/**
 * ZK Tool Executor - Exact same logic as your webapp's zkPretClient
 * This executes ZK-PRET tools exactly like STDIO mode but via HTTP server
 */
export class ZKToolExecutor {
  private config: ZKExecutorConfig;

  constructor() {
    console.log('=== ZK-TOOL EXECUTOR INITIALIZATION (HTTP SERVER) ===');
    console.log('DEBUG: process.env.ZK_PRET_STDIO_PATH =', process.env.ZK_PRET_STDIO_PATH);

    this.config = {
      stdioPath: process.env.ZK_PRET_STDIO_PATH || 'C:\\CHAINAIM3003\\mcp-servers\\zk-pret-test-v3.6',
      stdioBuildPath: process.env.ZK_PRET_STDIO_BUILD_PATH || './build/tests/with-sign',
      timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '1800000')
    };

    console.log('DEBUG: Final stdioPath =', this.config.stdioPath);
    console.log('DEBUG: Final stdioBuildPath =', this.config.stdioBuildPath);
    console.log('DEBUG: Final timeout =', this.config.timeout);
    console.log('=====================================');
  }

  async initialize(): Promise<void> {
    try {
      await this.healthCheck();
      logger.info('ZK Tool Executor initialized successfully');
    } catch (error) {
      logger.warn('ZK Tool Executor initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        stdioPath: this.config.stdioPath
      });
    }
  }

  async healthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      console.log('=== ZK EXECUTOR HEALTH CHECK ===');
      console.log('Checking path:', this.config.stdioPath);

      const fs = await import('fs/promises');
      await fs.access(this.config.stdioPath);
      console.log('✅ Main path exists');

      const buildPath = path.join(this.config.stdioPath, this.config.stdioBuildPath);
      console.log('Checking build path:', buildPath);
      await fs.access(buildPath);
      console.log('✅ Build path exists');

      // Check for compiled JavaScript files - same as your webapp
      const jsFiles = [
        'GLEIFOptimMultiCompanyVerificationTestWithSign.js',
        'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',
        'EXIMOptimMultiCompanyVerificationTestWithSign.js'
      ];

      console.log('Checking for compiled JavaScript files:');
      for (const file of jsFiles) {
        const filePath = path.join(buildPath, file);
        try {
          await fs.access(filePath);
          console.log(`✅ Found: ${file}`);
        } catch {
          console.log(`❌ Missing: ${file}`);
        }
      }

      console.log('=========================');

      return {
        connected: true,
        status: { mode: 'http-server', path: this.config.stdioPath, buildPath }
      };
    } catch (error) {
      console.log('❌ ZK Executor Health Check Failed:', error instanceof Error ? error.message : String(error));
      return { connected: false };
    }
  }

  getAvailableTools(): string[] {
    // Exact same tools as your webapp
    return [
      'get-GLEIF-verification-with-sign',
      'get-Corporate-Registration-verification-with-sign',
      'get-EXIM-verification-with-sign',
      'get-Composed-Compliance-verification-with-sign',
      'get-BSDI-compliance-verification',
      'get-BPI-compliance-verification',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
      'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign',
      'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign',
      'get-StablecoinProofOfReservesRisk-verification-with-sign',
      'execute-composed-proof-full-kyc',
      'execute-composed-proof-financial-risk',
      'execute-composed-proof-business-integrity',
      'execute-composed-proof-comprehensive'
    ];
  }

  async executeTool(toolName: string, parameters: any = {}): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      console.log('=== HTTP SERVER TOOL EXECUTION START ===');
      console.log('Tool Name:', toolName);
      console.log('Parameters:', JSON.stringify(parameters, null, 2));

      const result = await this.executeStdioTool(toolName, parameters);
      const executionTime = Date.now() - startTime;

      console.log('=== HTTP SERVER TOOL EXECUTION SUCCESS ===');
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('Result Success:', result.success);
      console.log('==============================');

      return {
        success: result.success,
        result: result.result || {
          status: result.success ? 'completed' : 'failed',
          zkProofGenerated: result.success,
          timestamp: new Date().toISOString(),
          output: result.output || '',
          executionMode: 'http-server'
        },
        executionTime: `${executionTime}ms`
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.log('=== HTTP SERVER TOOL EXECUTION FAILED ===');
      console.log('Error:', error instanceof Error ? error.message : String(error));
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('=============================');

      return {
        success: false,
        result: {
          status: 'failed',
          zkProofGenerated: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          executionMode: 'http-server'
        },
        executionTime: `${executionTime}ms`
      };
    }
  }

  async executeStdioTool(toolName: string, parameters: any = {}): Promise<any> {
    // FIXED: Updated tool script mapping to match actual compiled files
    const toolScriptMap: Record<string, string> = {
      'get-GLEIF-verification-with-sign': 'GLEIFOptimMultiCompanyVerificationTestWithSign.js',
      'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',
      'get-EXIM-verification-with-sign': 'EXIMOptimMultiCompanyVerificationTestWithSign.js',
      'get-Composed-Compliance-verification-with-sign': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'get-BSDI-compliance-verification': 'BusinessStdIntegrityOptimMerkleVerificationTestWithSign.js',
      'get-BPI-compliance-verification': 'BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js',
      'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign': 'RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js',
      'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign': 'RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js',
      'get-StablecoinProofOfReservesRisk-verification-with-sign': 'RiskLiquidityStableCoinOptimMerkleVerificationTestWithSign.js',
      'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'execute-composed-proof-financial-risk': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'execute-composed-proof-business-integrity': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js'
    };

    const scriptFile = toolScriptMap[toolName];
    if (!scriptFile) {
      throw new Error(`Unknown tool: ${toolName}. Available tools: ${Object.keys(toolScriptMap).join(', ')}`);
    }

    console.log('=== HTTP SERVER STDIO TOOL EXECUTION ===');
    console.log('Tool Name:', toolName);
    console.log('Script File:', scriptFile);
    console.log('============================');

    return await this.executePreCompiledScript(scriptFile, parameters, toolName);
  }

  async executePreCompiledScript(scriptFile: string, parameters: any = {}, toolName?: string): Promise<any> {
    const compiledScriptPath = path.join(this.config.stdioPath, this.config.stdioBuildPath, scriptFile);

    console.log('🔍 Checking for pre-compiled JavaScript file...');
    console.log('Expected compiled script path:', compiledScriptPath);

    if (!existsSync(compiledScriptPath)) {
      console.log('❌ Pre-compiled JavaScript file not found');
      console.log('🔧 Attempting to build the project first...');

      const buildSuccess = await this.buildProject();
      if (!buildSuccess) {
        throw new Error(`Pre-compiled JavaScript file not found: ${compiledScriptPath}. Please run 'npm run build' in the ZK-PRET-TEST-V3 directory first.`);
      }

      if (!existsSync(compiledScriptPath)) {
        throw new Error(`Build completed but compiled file still not found: ${compiledScriptPath}`);
      }
    }

    console.log('✅ Pre-compiled JavaScript file found');
    console.log('🚀 Executing compiled JavaScript file...');

    return await this.executeJavaScriptFile(compiledScriptPath, parameters, toolName);
  }

  async buildProject(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('🔨 Building ZK-PRET project...');
      console.log('Working directory:', this.config.stdioPath);

      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 BUILD-STDOUT:', output.trim());
      });

      buildProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 BUILD-STDERR:', output.trim());
      });

      buildProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('✅ Project build completed successfully');
          resolve(true);
        } else {
          console.log('❌ Project build failed with exit code:', code);
          console.log('Build STDERR:', stderr);
          console.log('Build STDOUT:', stdout);
          resolve(false);
        }
      });

      buildProcess.on('error', (error: Error) => {
        console.log('❌ Build process error:', error.message);
        resolve(false);
      });
    });
  }

  async executeJavaScriptFile(scriptPath: string, parameters: any = {}, toolName?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = this.prepareScriptArgs(parameters, toolName);

      console.log('=== HTTP SERVER JAVASCRIPT EXECUTION DEBUG ===');
      console.log('Script Path:', scriptPath);
      console.log('Working Directory:', this.config.stdioPath);
      console.log('Arguments:', args);
      console.log('Full Command:', `node ${scriptPath} ${args.join(' ')}`);
      console.log('===================================');

      const nodeProcess = spawn('node', [scriptPath, ...args], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          nodeProcess.kill('SIGTERM');
          console.log(`❌ EXECUTION TIMEOUT after ${this.config.timeout}ms`);
          reject(new Error(`Script execution timeout after ${this.config.timeout}ms`));
        }
      }, this.config.timeout);

      nodeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 STDOUT:', output.trim());
      });

      nodeProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 STDERR:', output.trim());
      });

      nodeProcess.on('close', (code: number | null) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);

          console.log('=== HTTP SERVER JAVASCRIPT EXECUTION COMPLETE ===');
          console.log('Exit Code:', code);
          console.log('Final STDOUT Length:', stdout.length);
          console.log('Final STDERR Length:', stderr.length);
          console.log('=====================================');

          if (code === 0) {
            console.log('✅ JAVASCRIPT EXECUTION SUCCESSFUL');

            // Analyze the output to determine verification result vs execution result
            const verificationFailed = stdout.includes('Verification failed') ||
              stdout.includes('Risk threshold not met') ||
              stdout.includes('Compliance check failed') ||
              stderr.includes('verification failed');

            const verificationPassed = stdout.includes('Verification successful') ||
              stdout.includes('Proof verified') ||
              stdout.includes('Compliance check passed');

            // Parse actual proof data from stdout if available - same as webapp
            let proofData = null;
            let zkProof = null;
            try {
              const jsonMatches = stdout.match(/\{[^}]*"proof"[^}]*\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                proofData = JSON.parse(jsonMatches[jsonMatches.length - 1]);
                zkProof = proofData.proof;
              }
            } catch (e) {
              console.log('No parseable proof data found in output');
            }

            // NEW: Enhanced response format that separates execution vs verification
            const response = {
              // System execution always successful if we reach here
              systemExecution: {
                status: 'success',
                executionCompleted: true,
                scriptExecuted: true,
                executionTime: new Date().toISOString()
              },

              // Verification result based on actual ZK proof outcome
              verificationResult: {
                success: verificationPassed && !verificationFailed,
                zkProofGenerated: true,
                status: verificationPassed ? 'verification_passed' : 'verification_failed',
                reason: verificationFailed ? 'Business logic verification failed (this is normal for strict compliance checks)' : 'Verification completed successfully'
              },

              // Legacy compatibility
              status: 'completed',
              zkProofGenerated: true,
              timestamp: new Date().toISOString(),
              output: stdout,
              stderr: stderr,
              executionStrategy: 'HTTP Server - Pre-compiled JavaScript execution (Fixed File Mappings)',
              executionMode: 'http-server',

              // Include actual proof data if found
              ...(proofData && { proofData }),
              ...(zkProof && { zkProof }),
              executionMetrics: this.extractExecutionMetrics(stdout)
            };

            resolve({
              success: true, // System execution successful
              result: response
            });
          } else {
            console.log(`❌ JAVASCRIPT EXECUTION FAILED with exit code ${code}`);
            reject(new Error(`Script failed with exit code ${code}: ${stderr || stdout || 'No output'}`));
          }
        }
      });

      nodeProcess.on('error', (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          console.log('❌ JAVASCRIPT PROCESS ERROR:', error.message);
          reject(error);
        }
      });

      console.log(`🚀 JavaScript process spawned with PID: ${nodeProcess.pid}`);
    });
  }

  extractExecutionMetrics(output: string): any {
    const metrics: any = {};

    try {
      // Extract timing information - same as webapp
      const timingMatches = output.match(/\b(\d+)\s*ms\b/g);
      if (timingMatches) {
        metrics.timings = timingMatches.map(t => t.replace(/\s*ms\b/, ''));
      }

      if (output.includes('Proof generated successfully')) {
        metrics.proofGenerated = true;
      }

      if (output.includes('Circuit compiled')) {
        metrics.circuitCompiled = true;
      }

      if (output.includes('Verification successful')) {
        metrics.verificationSuccessful = true;
      }

      if (output.includes('GLEIF data fetched')) {
        metrics.gleifDataFetched = true;
      }

      const numericMatches = output.match(/\b\d+\s*(bytes|kb|mb)\b/gi);
      if (numericMatches) {
        metrics.sizeMetrics = numericMatches;
      }

    } catch (error) {
      console.log('Error extracting metrics:', error);
    }

    return metrics;
  }

  prepareScriptArgs(parameters: any, toolName?: string): string[] {
    console.log('=== HTTP SERVER PREPARING SCRIPT ARGS ===');
    console.log('Tool Name:', toolName);
    console.log('Input parameters:', parameters);

    const args: string[] = [];

    // Exact same argument preparation logic as your webapp
    switch (toolName) {
      case 'get-GLEIF-verification-with-sign':
        const companyName = parameters.companyName || parameters.legalName || parameters.entityName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
        args.push(String(companyName));
        console.log(`Added GLEIF arg 1 (company name): "${companyName}"`);
        args.push('TESTNET');
        console.log('Added GLEIF arg 2 (network type): "TESTNET"');
        break;

      case 'get-Corporate-Registration-verification-with-sign':
        const cin = parameters.cin;
        if (cin) {
          args.push(String(cin));
          console.log(`Added Corporate Registration arg 1 (CIN): "${cin}"`);
        } else {
          console.log('⚠️  No CIN found for Corporate Registration verification');
        }
        args.push('TESTNET');
        console.log('Added Corporate Registration arg 2 (network type): "TESTNET"');
        break;

      case 'get-EXIM-verification-with-sign':
        const eximCompanyName = parameters.companyName || parameters.legalName || parameters.entityName;
        if (eximCompanyName) {
          args.push(String(eximCompanyName));
          console.log(`Added EXIM arg 1 (company name): "${eximCompanyName}"`);
        } else {
          console.log('⚠️  No company name found for EXIM verification');
        }
        args.push('TESTNET');
        console.log('Added EXIM arg 2 (network type): "TESTNET"');
        break;

      case 'get-Composed-Compliance-verification-with-sign':
        const composedCompanyName = parameters.companyName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
        const composedCin = parameters.cin || 'U01112TZ2022PTC039493';

        args.push(String(composedCompanyName));
        console.log(`Added Composed Compliance arg 1 (company name): "${composedCompanyName}"`);

        args.push(String(composedCin));
        console.log(`Added Composed Compliance arg 2 (CIN): "${composedCin}"`);
        break;

      case 'get-BPI-compliance-verification':
        // Business Process Integrity verification expects: [processType, expectedFilePath, actualFilePath]
        const processType = parameters.processType;
        const expectedFileName = parameters.expectedProcessFile;
        const actualFileName = parameters.actualProcessFile;

        if (processType) {
          args.push(String(processType));
          console.log(`Added BPI arg 1 (process type): "${processType}"`);
        } else {
          console.log('⚠️  No process type found for BPI verification');
          args.push('SCF'); // Default to SCF
          console.log('Added BPI arg 1 (default process type): "SCF"');
        }

        // Map to actual file paths using environment variables
        const basePath = this.config.stdioPath;
        let expectedFilePath, actualFilePath;

        if (processType === 'SCF') {
          const expectedRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_SCF_EXPECTED || './src/data/scf/process/EXPECTED';
          const actualRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_SCF_ACTUAL || './src/data/scf/process/ACTUAL';

          expectedFilePath = `${expectedRelPath}/SCF-Expected.bpmn`;

          // Intelligent mapping based on uploaded filename
          if (actualFileName && actualFileName.includes('Accepted1')) {
            actualFilePath = `${actualRelPath}/SCF-Accepted1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Accepted2')) {
            actualFilePath = `${actualRelPath}/SCF-Accepted2.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected1')) {
            actualFilePath = `${actualRelPath}/SCF-Rejected1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected2')) {
            actualFilePath = `${actualRelPath}/SCF-Rejected2.bpmn`;
          } else {
            actualFilePath = `${actualRelPath}/SCF-Accepted1.bpmn`; // Default
          }
        } else if (processType === 'DVP') {
          const expectedRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_DVP_EXPECTED || './src/data/DVP/process/EXPECTED';
          const actualRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_DVP_ACTUAL || './src/data/DVP/process/ACTUAL';

          expectedFilePath = `${expectedRelPath}/DVP-Expected.bpmn`;

          // Intelligent mapping for DVP files
          if (actualFileName && actualFileName.includes('Accepted1')) {
            actualFilePath = `${actualRelPath}/DVP-Accepted1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Accepted2')) {
            actualFilePath = `${actualRelPath}/DVP-Accepted2.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected1')) {
            actualFilePath = `${actualRelPath}/DVP-Rejected1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected2')) {
            actualFilePath = `${actualRelPath}/DVP-Rejected2.bpmn`;
          } else {
            actualFilePath = `${actualRelPath}/DVP-Accepted1.bpmn`; // Default
          }
        } else if (processType === 'STABLECOIN') {
          const expectedRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_STABLECOIN_EXPECTED || './src/data/STABLECOIN/process/EXPECTED';
          const actualRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_STABLECOIN_ACTUAL || './src/data/STABLECOIN/process/ACTUAL';

          expectedFilePath = `${expectedRelPath}/STABLECOIN-Expected.bpmn`;

          // Intelligent mapping for STABLECOIN files
          if (actualFileName && actualFileName.includes('Accepted1')) {
            actualFilePath = `${actualRelPath}/STABLECOIN-Accepted1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Accepted2')) {
            actualFilePath = `${actualRelPath}/STABLECOIN-Accepted2.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected1')) {
            actualFilePath = `${actualRelPath}/STABLECOIN-Rejected1.bpmn`;
          } else if (actualFileName && actualFileName.includes('Rejected2')) {
            actualFilePath = `${actualRelPath}/STABLECOIN-Rejected2.bpmn`;
          } else {
            actualFilePath = `${actualRelPath}/STABLECOIN-Accepted1.bpmn`; // Default
          }
        } else {
          // Fallback to SCF
          const expectedRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_SCF_EXPECTED || './src/data/scf/process/EXPECTED';
          const actualRelPath = process.env.ZK_PRET_DATA_PROCESS_PATH_SCF_ACTUAL || './src/data/scf/process/ACTUAL';
          expectedFilePath = `${expectedRelPath}/SCF-Expected.bpmn`;
          actualFilePath = `${actualRelPath}/SCF-Accepted1.bpmn`;
        }

        args.push(expectedFilePath);
        console.log(`Added BPI arg 2 (expected file path): "${expectedFilePath}"`);

        args.push(actualFilePath);
        console.log(`Added BPI arg 3 (actual file path): "${actualFilePath}"`);

        console.log(`Final BPI command: node script.js "${processType}" "${expectedFilePath}" "${actualFilePath}"`);
        break;

      case 'get-BSDI-compliance-verification':
        // Business Standard Data Integrity verification expects: [filePath]
        let bsdiFilePath = parameters.filePath;

        if (bsdiFilePath) {
          // Normalize the path to match actual directory structure
          if (bsdiFilePath.includes('./src/data/scf/BILLOFLADING/')) {
            bsdiFilePath = bsdiFilePath.replace('./src/data/scf/BILLOFLADING/', './src/data/scf/BILLOFLADING/');
          }
          args.push(String(bsdiFilePath));
          console.log(`Added BSDI arg 1 (file path): "${bsdiFilePath}"`);
        } else {
          console.log('⚠️  No file path found for BSDI verification');
          // Default to a valid BOL file
          const defaultFilePath = './src/data/scf/BILLOFLADING/BOL-VALID-1.json';
          args.push(defaultFilePath);
          console.log(`Added BSDI arg 1 (default file path): "${defaultFilePath}"`);
        }

        console.log(`Final BSDI command: node script.js "${bsdiFilePath || './src/data/scf/BILLOFLADING/BOL-VALID-1.json'}"`);
        break;

      case 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk':
        // Legacy Advanced Risk verification - same as get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign
        const legacyAdvThreshold = parameters.liquidityThreshold || 100;
        const legacyAdvActusUrl = parameters.actusUrl || 'http://localhost:8083/eventsBatch';
        const legacyAdvConfigPath = parameters.configFilePath || 'src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json';
        const legacyAdvExecutionMode = parameters.executionMode || 'ultra_strict';
        args.push(String(legacyAdvThreshold));
        args.push(String(legacyAdvActusUrl));
        args.push(String(legacyAdvConfigPath));
        args.push(String(legacyAdvExecutionMode));
        console.log(`Added Legacy Advanced Risk arg 1 (threshold): "${legacyAdvThreshold}"`);
        console.log(`Added Legacy Advanced Risk arg 2 (actus URL): "${legacyAdvActusUrl}"`);
        console.log(`Added Legacy Advanced Risk arg 3 (config path): "${legacyAdvConfigPath}"`);
        console.log(`Added Legacy Advanced Risk arg 4 (execution mode): "${legacyAdvExecutionMode}"`);
        break;

      case 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign':
        // Legacy Basel3 Risk verification - same as get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign
        const legacyLcrThreshold = parameters.lcrThreshold || parameters.liquidityThreshold || 100;
        const legacyNsfrThreshold = parameters.nsfrThreshold || 100;
        const legacyBaselActusUrl = parameters.actusUrl || 'http://localhost:8083/eventsBatch';
        const legacyBaselConfigPath = parameters.configFilePath || 'src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json';
        args.push(String(legacyLcrThreshold));
        args.push(String(legacyNsfrThreshold));
        args.push(String(legacyBaselActusUrl));
        args.push(String(legacyBaselConfigPath));
        console.log(`Added Legacy Basel3 Risk arg 1 (lcrThreshold): "${legacyLcrThreshold}"`);
        console.log(`Added Legacy Basel3 Risk arg 2 (nsfrThreshold): "${legacyNsfrThreshold}"`);
        console.log(`Added Legacy Basel3 Risk arg 3 (actus URL): "${legacyBaselActusUrl}"`);
        console.log(`Added Legacy Basel3 Risk arg 4 (config path): "${legacyBaselConfigPath}"`);
        break;

      case 'get-StablecoinProofOfReservesRisk-verification-with-sign':
        // StableCoin verification expects: [threshold, url, config, mode, jurisdiction]
        const threshold = parameters.liquidityThreshold || 100;
        const actusUrl = parameters.actusUrl || 'http://localhost:8083/eventsBatch';
        const configPath = parameters.configFilePath || 'src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json';
        const executionMode = parameters.executionMode || 'ultra_strict';
        const jurisdiction = parameters.jurisdiction || 'US';

        args.push(String(threshold));
        args.push(String(actusUrl));
        args.push(String(configPath));
        args.push(String(executionMode));
        args.push(String(jurisdiction));

        console.log(`Added StableCoin arg 1 (threshold): "${threshold}"`);
        console.log(`Added StableCoin arg 2 (actus URL): "${actusUrl}"`);
        console.log(`Added StableCoin arg 3 (config path): "${configPath}"`);
        console.log(`Added StableCoin arg 4 (execution mode): "${executionMode}"`);
        console.log(`Added StableCoin arg 5 (jurisdiction): "${jurisdiction}"`);
        break;

      case 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign':
        // Advanced Risk verification expects: [threshold, url, config, mode]
        const advThreshold = parameters.liquidityThreshold || 100;
        const advActusUrl = parameters.actusUrl || 'http://localhost:8083/eventsBatch';
        const advConfigPath = parameters.configFilePath || 'src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json';
        const advExecutionMode = parameters.executionMode || 'ultra_strict';

        args.push(String(advThreshold));
        args.push(String(advActusUrl));
        args.push(String(advConfigPath));
        args.push(String(advExecutionMode));

        console.log(`Added Advanced Risk arg 1 (threshold): "${advThreshold}"`);
        console.log(`Added Advanced Risk arg 2 (actus URL): "${advActusUrl}"`);
        console.log(`Added Advanced Risk arg 3 (config path): "${advConfigPath}"`);
        console.log(`Added Advanced Risk arg 4 (execution mode): "${advExecutionMode}"`);
        break;

      case 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign':
        // Basel3 Risk verification expects: [lcrThreshold, nsfrThreshold, actusUrl, portfolioPath]
        const lcrThreshold = parameters.lcrThreshold || parameters.liquidityThreshold || 100;
        const nsfrThreshold = parameters.nsfrThreshold || 100;
        const baselActusUrl = parameters.actusUrl || 'http://localhost:8083/eventsBatch';
        const baselConfigPath = parameters.configFilePath || 'src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json';

        args.push(String(lcrThreshold));
        args.push(String(nsfrThreshold));
        args.push(String(baselActusUrl));
        args.push(String(baselConfigPath));

        console.log(`Added Basel3 Risk arg 1 (lcrThreshold): "${lcrThreshold}"`);
        console.log(`Added Basel3 Risk arg 2 (nsfrThreshold): "${nsfrThreshold}"`);
        console.log(`Added Basel3 Risk arg 3 (actus URL): "${baselActusUrl}"`);
        console.log(`Added Basel3 Risk arg 4 (config path): "${baselConfigPath}"`);
        break;

      default:
        // For other verification types, use fallback logic
        const fallbackCompanyName = parameters.legalName || parameters.entityName || parameters.companyName;
        if (fallbackCompanyName) {
          args.push(String(fallbackCompanyName));
          console.log(`Added fallback arg 1 (company name): "${fallbackCompanyName}"`);
        }
        args.push('TESTNET');
        console.log('Added fallback arg 2 (network type): "TESTNET"');
        break;
    }

    console.log('Final args array:', args);
    console.log('Command will be: node script.js', args.map(arg => `"${arg}"`).join(' '));
    console.log('=============================');

    return args;
  }
}

export const zkToolExecutor = new ZKToolExecutor();