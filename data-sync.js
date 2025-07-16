import { AES, enc } from "crypto-js";
import { getApp, initializeApp } from "firebase/app";
import {
    get,
    getDatabase,
    orderByKey,
    query,
    ref,
    update,
} from "firebase/database";

let LSitems = [
    "builds",
    "fa-trackItems",
    "fd-currentGameData",
    "fd-endlessModesData",
    "fd-playerStats",
];

const fb_siteUserData = {
        apiKey: "AIzaSyDKnNr9NGleuqY_S5sWlkzj6NeVb-j7eu0",
        authDomain: "ff-site-user-data.firebaseapp.com",
        projectId: "ff-site-user-data",
        storageBucket: "ff-site-user-data.firebasestorage.app",
        messagingSenderId: "488410681248",
        appId: "1:488410681248:web:1982ba784b3061940cdec5",
        measurementId: "G-ZHZM7JVTXY",
    },
    fb_calculator = {
        apiKey: "AIzaSyAHVFTyCrEeHuOY9POiWkpA2mI70X5P1jQ",
        authDomain: "fc-v3-8b3f9.firebaseapp.com",
        databaseURL:
            "https://fc-v3-8b3f9-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "fc-v3-8b3f9",
        storageBucket: "fc-v3-8b3f9.appspot.com",
        messagingSenderId: "31377888705",
        appId: "1:31377888705:web:3018d8fc0a07e867ec0b40",
    };
initializeApp(fb_siteUserData, "sud");
initializeApp(fb_calculator, "fc");

const sud_rtdb = getDatabase(getApp("sud")),
    fc_rtdb = getDatabase(getApp("fc"));

export let checkSyncNeed = () => {
        for (let item of LSitems) if (localStorage.getItem(item)) return true;
    },
    syncUserData = async (username, uid) => {
        let userData = {
            calculator: {},
            armory: {},
            frontierdle: {},
        };

        for (let item of LSitems) {
            let data = localStorage.getItem(item);
            if (data === null) {
                continue;
            }
            data = JSON.parse(data);
            if (data === undefined || data === null) {
                localStorage.removeItem(item);
                continue;
            }
            if (item === "builds") {
                let sudBuilds = {};
                for (let fcLSBuild in data) {
                    let id = data[fcLSBuild].id;
                    let fcDBBuild = (
                        await get(
                            query(ref(fc_rtdb, `builds/${id}`), orderByKey())
                        )
                    ).val();
                    sudBuilds[id] = await fcDBBuild;
                }
                userData.calculator.builds = sudBuilds;
            } else if (item === "fa-trackItems") {
                userData.armory.tracklist = data;
            } else if (item === "fd-currentGameData") {
                userData.frontierdle.currentGamesData = data;
            } else if (item === "fd-endlessModesData") {
                let deprecatedUserId = JSON.parse(
                    localStorage.getItem("fd-userId")
                );
                if (!deprecatedUserId) continue;
                for (let mode in data) {
                    let oldEncryptedModeData = data[mode].data;
                    if (!oldEncryptedModeData) continue;
                    let decryptedModeData;
                    try {
                        decryptedModeData = AES.decrypt(
                            oldEncryptedModeData,
                            deprecatedUserId + 8
                        ).toString(enc.Utf8);
                    } catch (err) {
                        continue;
                    }
                    let newEncryptedModeData = AES.encrypt(
                        decryptedModeData,
                        uid + 581827
                    ).toString();
                    data[mode].data = newEncryptedModeData;
                }
                userData.frontierdle.endlessModesData = data;
                localStorage.removeItem("fd-userId");
            } else if (item === "fd-playerStats") {
                userData.frontierdle.playerStats = data;
            }
            localStorage.removeItem(item);
        }

        let existingUserData = await (
            await get(
                query(ref(sud_rtdb, `${username}/siteData`), orderByKey())
            )
        ).val();

        for (let site in userData) {
            if (
                !Object.keys(userData[site]).length ||
                existingUserData[site] !== undefined
            ) {
                delete userData[site];
            }
        }

        return await update(ref(sud_rtdb, `${username}/siteData`), userData);
    };
