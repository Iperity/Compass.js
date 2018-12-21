import Promise = JQuery.Promise;
import {compassLogger} from "./Logging";
import * as $ from "jquery";

const CONTENT_TYPE = 'application/vnd.iperity.compass.v2+json';

/**
 * Helper class to perform rest-requests on the Compass platform.
 *
 * To obtain an instance, use the 'restApi' member of the connection.
 */
export class RestApi {

    /**
     * The authentication header to include in every rest-request.
     */
    public authHeader: string;

    /**
     * The url for all rest-quests, without the path.
     *
     * in the form of: 'https://rest.<basedom>'
     */
    public baseUrl: string;

    private _username: string;
    private _basedom: string;

    private _myUserPromise: Promise<any> = null;
    private _myCompanyUrlPromise: Promise<any> = null;
    private _myFirstIdentityPromise: Promise<any> = null;

    /**
     * Create the RestApi helper
     *
     * Usually, creating the RestApi is done by the Connection object.
     * @param {string} basedom - base-domain for the environment.
     * @param {string} username - Compass username.
     * @param {string} password - Compass password
     */
    constructor(basedom: string, username: string, password: string) {
        this._basedom = basedom;
        this._username = username;
        this.authHeader = "Basic " + btoa(this._username + ":" + password);
        this.baseUrl = `https://rest.${this._basedom}`;
    }

    /**
     * Perform a get-request on the rest-api.
     *
     * @param url - url to perform the rest-request on.
     * If the url contains '://', it's assumed to be a whole url. Otherwise, it's assumed to be a path, and the baseUrl is prepended.
     * @param [data] - Request body as a javascript object. Default: No body data sent.
     * @returns {Promise<any>} - Returns a Promise that resolves with the answer from the rest-api in a js object, or rejects if an error occurs.
     */
    public get(url: string, data: any = null): Promise<any> {
        return this.doRequest(url, 'GET', data);
    }

    /**
     * Perform a post-request on the rest-api.
     *
     * @param url - url to perform the rest-request on.
     * If the url contains '://', it's assumed to be a whole url. Otherwise, it's assumed to be a path, and the baseUrl is prepended.
     * @param [data] - Request body as a javascript object. Default: No body data sent.
     * @returns {Promise<Object>} - Returns a Promise that resolves with the answer from the rest-api in a js object, or rejects if an error occurs.
     */
    public post(url: string, data: any = null): Promise<any> {
        return this.doRequest(url, 'POST', data);
    }

    /**
     * Perform API request.
     *
     * @param url - url to perform the rest-request on.
     * If the url contains '://', it's assumed to be a whole url. Otherwise, it's assumed to be a path, and the baseUrl is prepended.
     * @param {string} method - http method
     * @param data - request body as a javascript object
     * @returns {Promise<any>} - Returns a Promise that resolves with the answer from the rest-api in a js object, or rejects if an error occurs.
     */
    public doRequest(url: string, method: string, data: any): Promise<any> {

        const fullUrl = url.indexOf('://') === -1 ? `https://rest.${this._basedom}/${url}` : url;
        const promise = $.ajax(fullUrl, {
            method: method,
            headers: {
                "Accept": CONTENT_TYPE,
                "Authorization": this.authHeader,
                "X-No-Redirect": "true",
            },
            contentType: CONTENT_TYPE,
            dataType: 'json',
            data: JSON.stringify(data),
            // parse empty response into object
            // by default, jQuery treats empty response as an error,
            // but Compass API has 'void' methods.
            dataFilter: (response) => response === '' ? '{}' : response,
        });

        promise.fail( (result, err) => {
            compassLogger.warn(`REST ${method} request to ${url} with data ${JSON.stringify(data) } failed with error: ${err}`);
        });
        return promise;
    }

    /**
     * Get the object representing the logged-in user from the rest-api.
     *
     * See the rest-api documentation or example code for more details.
     * If you need the url to the user object, use the 'self' member of the object that the Promise resolves with.
     * @returns {Promise<Object>} - A promise that resolves with the user object, or rejects if an error occurs.
     */
    public getMyUser(): Promise<any> {
        if (!this._myUserPromise) {
            this._myUserPromise = this.get('user');
        }
        return this._myUserPromise;
    }

    /**
     * Get the object representing the first identity of the logged-in user from the rest-api.
     *
     * See the rest-api documentation or example code for more details.
     * If you need the url to the identity object, use the 'self' member of the object that the Promise resolves with.
     * @returns {Promise<Object>} - A promise that resolves with the identity object, or rejects if an error occurs.
     */
    public getMyFirstIdentity(): Promise<any> {
        if (!this._myFirstIdentityPromise) {
            this._myFirstIdentityPromise = this.getMyUser()
                .then( (user) => {
                    return this.get(`${user.self}/identities`)
                        .then( (identities) => {
                            const firstIdentity = identities[0];
                            return firstIdentity;
                        });
                });
        }
        return this._myFirstIdentityPromise;
    }

    /**
     * Get the object representing the company of the logged-in user from the rest-api.
     *
     * See the rest-api documentation or example code for more details.
     * If you need the url to the company object, use the 'self' member of the object that the Promise resolves with.
     * @returns {Promise<Object>} - A promise that resolves with the company object, or rejects if an error occurs.
     */
    public getMyCompany(): Promise<any> {
        if (!this._myCompanyUrlPromise) {
            this._myCompanyUrlPromise = this.get('company');
        }
        return this._myCompanyUrlPromise;
    }

    /**
     * Helper function to generate the url to an object on the Compass rest-api.
     * @param {string} type - The type of the object. For example: company, user, queue, identity, or phone.
     * @param {number} id - The numerical id of the object.
     * @returns {string} - The full url to a object with the specified type and numerical id.
     */
    public getUrlForObject(type: string, id: number) {
        return this.baseUrl + "/" + type + "/" + id;
    }
}

