export declare const AO: {
    module: string;
    scheduler: string;
    mu: string;
    src: {
        asset: string;
        collection: string;
        collectionActivity: string;
        comments: string;
        zone: {
            id: string;
            version: string;
        };
    };
    collectionRegistry: string;
};
export declare const HB: {
    defaultNode: string;
};
export declare const CONTENT_TYPES: {
    [key: string]: {
        type: string;
        serialize: (data: any) => any;
    };
};
export declare const GATEWAYS: {
    arweave: string;
    ao: string;
};
export declare const LICENSES: {
    udl: {
        label: string;
        address: string;
    };
};
export declare const TAGS: {
    keys: {
        access: string;
        ans110: {
            title: string;
            description: string;
            topic: string;
            type: string;
            implements: string;
            license: string;
        };
        assetType: string;
        banner: string;
        bootloader: string;
        collectionId: string;
        collectionName: string;
        commericalUse: string;
        contentType: string;
        creator: string;
        currency: string;
        dataModelTraining: string;
        dataProtocol: string;
        dateCreated: string;
        derivations: string;
        description: string;
        displayName: string;
        handle: string;
        implements: string;
        initialOwner: string;
        license: string;
        name: string;
        onBoot: string;
        paymentAddress: string;
        paymentMode: string;
        profileCreator: string;
        profileIndex: string;
        protocolName: string;
        renderWith: string;
        thumbnail: string;
        title: string;
        topic: string;
        type: string;
        zoneType: string;
    };
    values: {
        dataProtocol: string;
        document: string;
        user: string;
    };
};
export declare const UPLOAD: {
    node1: string;
    batchSize: number;
    chunkSize: number;
    dispatchUploadSize: number;
};
