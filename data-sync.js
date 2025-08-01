import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js/+esm";
import {
    getApp,
    initializeApp,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    get,
    getDatabase,
    orderByKey,
    query,
    ref,
    update,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

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
        apiKey: "AIzaSyC2Ub5r6sLzguGgsIGhXFFwL3zEpcOW4Yo",
        authDomain: "fantastic-calculator-51453.firebaseapp.com",
        projectId: "fantastic-calculator-51453",
        storageBucket: "fantastic-calculator-51453.firebasestorage.app",
        messagingSenderId: "414782650231",
        appId: "1:414782650231:web:e1e20967a22db2b3981372",
        measurementId: "G-96Y8V5G82G",
    };
initializeApp(fb_siteUserData, "sud");
initializeApp(fb_calculator, "fc");

const sud_rtdb = getDatabase(getApp("sud")),
    fc_rtdb = getDatabase(getApp("fc"));

let PUSH_CHARS =
    "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
function decode(id) {
    id = id.substring(0, 8);
    let timestamp = 0;
    for (let i = 0; i < id.length; i++) {
        let c = id.charAt(i);
        timestamp = timestamp * 64 + PUSH_CHARS.indexOf(c);
    }
    return timestamp;
}

export let checkSyncNeed = () => {
        for (let item of LSitems) if (localStorage.getItem(item)) return true;
    },
    syncUserData = async (username, uid) => {
        let userData = {
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
                for (let fcLSBuild in data) {
                    let id = data[fcLSBuild].id;
                    let timestamp = decode(id);
                    id = "FC" + id;
                    await update(ref(fc_rtdb, id), {
                        creator: username,
                        "visibility-timestamp": `private-${
                            10000000000000 - timestamp
                        }`,
                    });
                }
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
                        decryptedModeData = CryptoJS.AES.decrypt(
                            oldEncryptedModeData,
                            deprecatedUserId + 8
                        ).toString(CryptoJS.enc.Utf8);
                    } catch (err) {
                        continue;
                    }
                    let newEncryptedModeData = CryptoJS.AES.encrypt(
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
