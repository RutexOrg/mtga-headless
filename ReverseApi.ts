import dotenv from "dotenv";
import axios, { Axios } from 'axios';
import { ResourceOwnerPassword } from 'simple-oauth2';
dotenv.config();

export default class ReverseApi {
    private authClient: ResourceOwnerPassword;
    public client!: Axios;

    private static API_BASE: string = "https://api.platform.wizards.com"
    private static ID: string = "N8QFG8NEBJ5T35FB";
    private static SECRET: string = "VMK1RE8YK6YR4EABJU91";
    private static LANG: string = "en-US";

    private accessToken: string = "";

    constructor() {
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

        this.authClient = new ResourceOwnerPassword(config);
    }

    private createHttpClient() {
        this.client = axios.create({
            baseURL: ReverseApi.API_BASE + "/",
            headers: {
                "Authorization": "Bearer " + this.accessToken,
                "Accept-Language": ReverseApi.LANG
            },
            validateStatus(status) {
                const validStatus = new Set([400]);
                return validStatus.has(status)
            },
        });
    }

    public async login(username: string, password: string): Promise<void> {
        const tokenParams = {
            username: username,
            password: password,
        };

        const accessToken = await this.authClient.getToken(tokenParams);
        this.accessToken = accessToken.token.access_token as string;
        this.createHttpClient();

        console.log(accessToken.token);
    }

    public async reedemCode(code: string) {
        return (await this.client.get("redemption/code/" + code)).data
    }
}

// const api = new ReverseApi();
// await api.login(process.env.USER as string, process.env.PASS as string);
