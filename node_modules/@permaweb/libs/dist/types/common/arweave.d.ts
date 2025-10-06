import { DependencyType, TagType } from '../helpers/types.ts';
export declare function resolveTransactionWith(deps: DependencyType): (data: any) => Promise<any>;
export declare function createTransaction(deps: DependencyType, args: {
    data: File | string;
    tags?: TagType[];
}): Promise<string>;
export declare function runUpload(fileBlob: Blob, txOpts: any & {
    upload?: any;
}, uploadOpts: {
    apiUrl: string;
    token: string;
    chunkSize: number;
    batchSize?: number;
}): Promise<any>;
