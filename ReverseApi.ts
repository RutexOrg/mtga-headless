import dotenv from "dotenv";
import axios, { Axios } from 'axios';
import { ResourceOwnerPassword } from 'simple-oauth2';
import tls, { TLSSocket } from "node:tls";

dotenv.config();

interface IDoorBellV2 {
    code: string;
    environment: string;
    clientVersion: string;
    platform: string;
    playerId: string;
}

interface IProfileData {
    accountID: string,
    ccpaProtectData: boolean,
    countryCode: string,
    createdAt: string,
    dataOptIn: boolean,
    displayName: string,
    email: string,
    emailOptIn: boolean,
    emailVerified: boolean,
    externalID: string,
    gameID: string,
    languageCode: string,
    parentalConsentState: number,
    personaID: string,
    presenceSettings: {
        socialMode: string,
    },
    targetedAnalyticsOptOut: boolean,
}

// todo: win-registry reader helper
interface IApiParam {
    playerID: string;
}

interface IRemoteAddr {
    host: string,
    port: number,
}

class Connection {
    private sock!: TLSSocket;
    private remote: IRemoteAddr;

    constructor(addr: IRemoteAddr) {
        this.remote = addr;
    }

    public async connect(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.sock = tls.connect({
                host: this.remote.host,
                port: this.remote.port,
                minVersion: "TLSv1.2"
            }, () => {
                console.log("Socket.authorized: ", this.sock.authorized);
                console.log("Socket.encrypted: ", this.sock.encrypted);

                if (!this.sock.authorized || !this.sock.encrypted) {
                    reject(new Error("Failed to connect"));
                    return;
                }

                console.log("TLS Conn ok");
                resolve();
            });

            this.sock.on("data", (data) => {
                console.log("Got from server:", data.length);
            });

            this.sock.on("end", () => {
                console.log("Conn ended by server");
            });

            this.sock.on("error", (err) => {
                console.log("Error");
                reject(err);
            });
        });
    }

}

export default class ReverseApi {
    private authClient: ResourceOwnerPassword;
    public client!: Axios;

    private static readonly API_BASE: string = "https://api.platform.wizards.com"

    private static readonly ID: string = "N8QFG8NEBJ5T35FB";
    private static readonly SECRET: string = "VMK1RE8YK6YR4EABJU91";

    private static readonly DOORBELL_BASE: string = "https://doorbellprod.w2.mtgarena.com"
    // private static readonly DOORBELL_CONFIG: string = ReverseApi.DOORBELL_BASE + "/doorbell.config";

    private static readonly nonProdDoorCode = "ta4kBQcrBfdGd8AUjrv7lj9pYyA3Kkj9p39byJXuTdTBiZxRC6xgRQ==";
    private static readonly prodDoorCode = "46u7OAmyEZ6AtfgaPUHiXNiC55/mrtp3aAmE018KZamDhvr0vZ8mxg==";

    private static readonly version: string = "2025.50.20.9483"

    private accessToken: string = "";
    private remote: IRemoteAddr = {
        host: "",
        port: 0,
    }

    public connection!: Connection;

    private playerID: string
    private profileInfo!: IProfileData;

    constructor(apiParams: IApiParam) {
        const config = {
            client: {
                id: ReverseApi.ID,
                secret: ReverseApi.SECRET
            },
            auth: {
                tokenHost: ReverseApi.API_BASE,
                tokenPath: '/auth/oauth/token'
            },
        };
        this.playerID = apiParams.playerID;
        this.authClient = new ResourceOwnerPassword(config);
    }

    private createHttpClient() {
        this.client = axios.create({
            baseURL: ReverseApi.API_BASE + "/",
            headers: {
                "Authorization": "Bearer " + this.accessToken,
            }
        });
    }

    public async ring(): Promise<boolean> {
        const doorbellUri = "https://doorbellprod.w2.mtgarena.com/api/ring"
        const doorCode = doorbellUri.includes("w2.mtgarena.com")
            ? ReverseApi.prodDoorCode
            : ReverseApi.nonProdDoorCode

        let body: IDoorBellV2 = {
            code: doorCode,
            clientVersion: ReverseApi.version,
            environment: "Prod",
            playerId: this.playerID,
            platform: "Windows"
        }

        console.info(`Calling ${doorbellUri} with:`, body);
        const resp = await axios.post(doorbellUri + "?code=" + ReverseApi.prodDoorCode, body, {
            headers: { "Content-Type": "application/json" }
        });
        console.info("Doorbell response:", resp.data.fdURI)

        if (!resp?.data?.fdURI) {
            console.log("Looks like something is changed...")
            return false;
        }
        const regexResult = (/^tcp:\/\/([a-zA-Z0-9.-]+):(\d+)$/).exec(resp.data.fdURI);

        this.remote.host = regexResult![1] as string;
        this.remote.port = parseInt(regexResult![2] as string);

        return true;
    }

    public async login(username: string, password: string): Promise<void> {
        const tokenParams = {
            username: username,
            password: password,
        };

        const accessToken = await this.authClient.getToken(tokenParams);
        this.accessToken = accessToken.token.access_token as string;

        this.createHttpClient();
        await this.saveProfileInfo();
    }

    private async saveProfileInfo() {
        this.profileInfo = await this.getProfileInfo();
        console.log("Got profile info:", this.profileInfo)
    }


    public async reedemCode(code: string) {
        return (await this.client.get("redemption/code/" + code)).data
    }

    public async getProfileInfo(): Promise<IProfileData> {
        return (await this.client.get("profile")).data as IProfileData
    }

    public async createFDConnection() {
        this.connection = new Connection(this.remote);
        await this.connection.connect();
        console.log("Connected");
    }
}

const api = new ReverseApi({
    playerID: process.env.PID as string
});

await api.login(process.env.USER as string, process.env.PASS as string);
await api.ring();
await api.createFDConnection();