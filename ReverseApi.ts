import fetch from 'node-fetch';
import dotenv from "dotenv"
dotenv.config();


export default class ReverseApi {
    private endPointUrl: string = "";
    private loginURL = "https://api.platform.wizards.com/auth/oauth/token";

    private static ID: string = "N8QFG8NEBJ5T35FB";
    private static SECRET: string = "VMK1RE8YK6YR4EABJU91";

    constructor() {
    }

    public async login(login: string, password: string) {

        const body = new URLSearchParams({
            grant_type: 'password',
            username: login,
            password: password
        });

        const response = await fetch(this.loginURL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ` + Buffer.from(`${ReverseApi.ID}:${ReverseApi.SECRET}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        return response.json();
    }
}

const client = new ReverseApi();
const resp = await client.login(process.env.USER as string, process.env.PASS as string);
console.log(resp);

