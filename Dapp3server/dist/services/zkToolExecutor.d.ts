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
export declare class ZKToolExecutor {
    private config;
    constructor();
    initialize(): Promise<void>;
    healthCheck(): Promise<{
        connected: boolean;
        status?: any;
    }>;
    getAvailableTools(): string[];
    executeTool(toolName: string, parameters?: any): Promise<ToolExecutionResult>;
    executeStdioTool(toolName: string, parameters?: any): Promise<any>;
    executePreCompiledScript(scriptFile: string, parameters?: any, toolName?: string): Promise<any>;
    buildProject(): Promise<boolean>;
    executeJavaScriptFile(scriptPath: string, parameters?: any, toolName?: string): Promise<any>;
    extractExecutionMetrics(output: string): any;
    prepareScriptArgs(parameters: any, toolName?: string): string[];
}
export declare const zkToolExecutor: ZKToolExecutor;
//# sourceMappingURL=zkToolExecutor.d.ts.map