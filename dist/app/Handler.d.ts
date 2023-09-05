import express from 'express';
export declare function index(req: express.Request, res: express.Response): Promise<void>;
export declare function preview(req: express.Request, res: express.Response): Promise<void>;
export declare function myBackground(params: Record<string, any>, res: express.Response): Promise<void>;
export declare function vu(reqType: 'get' | 'put', params: Record<string, any>, res: express.Response): Promise<express.Response<any, Record<string, any>> | undefined>;
export declare function sysAsset(type: 'font' | 'formatIcon', file: string, res: express.Response): Promise<express.Response<any, Record<string, any>> | undefined>;
export declare function proxy(params: Record<string, any>, res: express.Response): Promise<express.Response<any, Record<string, any>> | undefined>;
export declare function api(apiName: string, method: string, params: Record<string, any>, res: express.Response): Promise<void>;
//# sourceMappingURL=Handler.d.ts.map