import { DependencyType, ProfileArgsType, ProfileType } from '../helpers/types.ts';
export declare function createProfileWith(deps: DependencyType): (args: ProfileArgsType, callback?: (status: any) => void) => Promise<string | null>;
export declare function updateProfileWith(deps: DependencyType): (args: ProfileArgsType, profileId: string, callback?: (status: any) => void) => Promise<string | null>;
export declare function updateProfileVersionWith(deps: DependencyType): (args: {
    profileId: string;
}) => Promise<string | null>;
export declare function getProfileByIdWith(deps: DependencyType): (profileId: string) => Promise<ProfileType | null>;
export declare function getProfileByWalletAddressWith(deps: DependencyType): (walletAddress: string) => Promise<(ProfileType & any) | null>;
