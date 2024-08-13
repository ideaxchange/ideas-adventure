import axios from "axios";
import { EventType } from "matrix-js-sdk";
import { MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

class MatrixProvider {
    private accessToken: string | undefined;
    private lastAccessTokenDate: number = Date.now();

    constructor(){
        //TODO: DELETE and move in synapse config or ...
        this
            .overrideRateLimitForAdminAccount()
            .then(()=>console.log('overrideRateLimitForAdminAccount'))
            .catch((error)=>console.error(error));
    }

    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    async getAccessToken(): Promise<string> {
        if (
            (this.accessToken && this.lastAccessTokenDate && Date.now() - this.lastAccessTokenDate > 3_600_000) ||
            !this.accessToken
        ) {
            await axios
                .post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                    type: "m.login.password",
                    user: process.env.MATRIX_ADMIN_USER,
                    password: process.env.MATRIX_ADMIN_PASSWORD,
                })
                .then((response) => {
                    if (response.status === 200 && response.data.errcode === undefined) {
                        this.accessToken = response.data.access_token;
                        this.lastAccessTokenDate = Date.now();
                        return Promise.resolve();
                    } else {
                        return Promise.reject(new Error("Failed with errcode " + response.data.errcode));
                    }
                });
        }
        if (!this.accessToken) {
            throw new Error("No access token found");
        }
        return this.accessToken;
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        return await axios
            .put(
                `${MATRIX_API_URI}_synapse/admin/v2/users/${matrixUserId}`,
                {
                    logout_devices: false,
                    password,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    async createRoomForArea():Promise<string>{
        //TODO : Creer un space avec toutes les areas ? et ne pas les afficher cote front ?

        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/createRoom`,{
        
                visibility : "private",
                initial_state : [
                    {
                        type: EventType.RoomHistoryVisibility,
                        content: { history_visibility: "joined" },
                    }
                ] 
            }
            ,     {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve(response.data.room_id);
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }

    async kickUserFromRoom(userID:string , roomID : string):Promise<void>{

        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/kick`,{
            reason: "deconnection",
            user_id: userID
            }
            ,     {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }

    async inviteUserToRoom(userID:string , roomID : string):Promise<void>{
        return await axios.post(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/invite`,{
            user_id: userID
            }
            ,     {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }

    private async overrideRateLimitForAdminAccount(){
        //env var
        const adminChatID = "@admin:matrix.workadventure.localhost";
        return await axios.post(`${MATRIX_API_URI}_synapse/admin/v1/users/${adminChatID}/override_ratelimit`,{
            message_per_second: 0,
            burst_count:0
            },{
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            }
        ).then((response)=>{
            if (response.status === 200) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error("Failed with status " + response.status));
            }
        })
    }
}


export const matrixProvider = new MatrixProvider();
