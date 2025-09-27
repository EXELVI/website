import React, { useState, useRef, useEffect, useCallback } from "react";
import { Rnd } from "react-rnd";
import { Camera, Trash2 } from "lucide-react";
import pako from "pako";

interface OutputItem {
    type: "command" | "output" | "error" | "success";
    content: string;
}

interface FileSystemNode {
    type: "file" | "directory";
    content?: string;
    children?: Record<string, FileSystemNode>;
}

interface Suggestion {
    type: string;
    value: string;
    display: string;
    isDirectory?: boolean;
}

interface Command {
    name: string;
    description: string;
    category?: string;
    root: boolean;
    autocomplete?: (currentArg?: string) => Suggestion[];
    execute: (input: string, currentUser?: number) => HTMLElement;
}

const DraggableTerminal = ({ onClose }: { onClose?: () => void }) => {
    // MARK: - Ascii arts
    const ascii: Record<string, any> = {
        // ASCII from neofetch: https://github.com/dylanaraps/neofetch
        chrome: (
            c1: string,
            c2: string,
            c3: string,
            c4: string,
            c5: string,
            browserName: string,
            user: string,
            dividerBar: string,
            uptime: string
        ) => `
<span>${c2}            .,:loool:,.                 ${c1}${user}@${browserName}
${c2}        .,coooooooooooooc,.             <span style='color: #ffffff'>${dividerBar}
${c2}     .,lllllllllllllllllllll,.          ${c2}OS: <span style='color: #ffffff'>Browser
${c2}    ;ccccccccccccccccccccccccc;         ${c2}Host: <span style='color: #ffffff'>${navigator.vendor}
${c1}  '${c2}ccccccccccccccccccccccccccccc.       ${c2}Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}
${c1} ,oo${c2}c::::::::okO${c5}000${c3}0OOkkkkkkkkkkk:      ${c2}Uptime: <span style='color: #ffffff'>${uptime}
${c1}.ooool${c2};;;;:x${c5}K0${c4}kxxxxxk${c5}0X${c3}K0000000000.     ${c2}Packages: <span style='color: #ffffff'>0
${c1}:oooool${c2};,;O${c5}K${c4}ddddddddddd${c5}KX${c3}000000000d     ${c2}Shell: <span style='color: #ffffff'>Bash
${c1}lllllool${c2};l${c5}N${c4}dllllllllllld${c5}N${c3}K000000000     ${c2}Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}
${c1}lllllllll${c2}o${c5}M${c4}dccccccccccco${c5}W${c3}K000000000     
${c1};cllllllllX${c5}X${c4}c:::::::::c${c5}0X${c3}000000000d
${c1}.ccccllllllO${c5}Nk${c4}c;,,,;cx${c5}KK${c3}0000000000.
${c1} .cccccclllllxOO${c5}OOO${c1}Okx${c3}O0000000000;
${c1}  .:ccccccccllllllllo${c3}O0000000OOO,
${c1}    ,:ccccccccclllcd${c3}0000OOOOOOl.
${c1}      '::ccccccccc${c3}dOOOOOOOkx:.
${c1}        ..,::cccc${c3}xOOOkkko;.
${c1}            ..,:${c3}dOkxl:.</span>
`,
        safari: (
            c1: string,
            c2: string,
            c3: string,
            c4: string,
            c5: string,
            c6: string,
            browserName: string,
            user: string,
            dividerBar: string,
            uptime: string
        ) => `
 <span>${c1}                    'c.           ${user}@${browserName}
${c1}                 ,xNMM.            <span style='color: #ffffff'>${dividerBar}
${c1}               .OMMMMo             ${c2}OS: <span style='color: #ffffff'>Browser
${c1}               OMMM0,              ${c2}Host: <span style='color: #ffffff'>${navigator.vendor}
${c1}     .;loddo:' loolloddol;.        ${c2}Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}
${c1}   cKMMMMMMMMMMNWMMMMMMMMMM0:      ${c2}Uptime: <span style='color: #ffffff'>${uptime}
${c2} .KMMMMMMMMMMMMMMMMMMMMMMMWd.      ${c2}Packages: <span style='color: #ffffff'>0
${c2} XMMMMMMMMMMMMMMMMMMMMMMMX.        ${c2}Shell: <span style='color: #ffffff'>Bash
${c3};MMMMMMMMMMMMMMMMMMMMMMMM:         ${c2}Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}
${c3}:MMMMMMMMMMMMMMMMMMMMMMMM:                
${c4}.MMMMMMMMMMMMMMMMMMMMMMMMX.               
 ${c4}kMMMMMMMMMMMMMMMMMMMMMMMMWd.             
 ${c5}.XMMMMMMMMMMMMMMMMMMMMMMMMMMk            
  ${c5}.XMMMMMMMMMMMMMMMMMMMMMMMMK.            
    ${c6}kMMMMMMMMMMMMMMMMMMMMMMd
     ;KMMMMMMMWXXWMMMMMMMk.
       .cooc,.    .,coo:. </span>
    `,
        firefox: (c1: string, c2: string, browserName: string, user: string, dividerBar: string, uptime: string) => `
<span style="color: ${c1}">${user}@${browserName}</span>
<span style="color: #ffffff">${dividerBar}</span>
<span style="color: ${c2};">OS: <span style='color: #ffffff'>Browser</span>
<span style="color: ${c2};">Host: <span style='color: #ffffff'>${navigator.vendor}</span>
<span style="color: ${c2};">Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}</span>
<span style="color: ${c2};">Uptime: <span style='color: #ffffff'>${uptime}</span>
<span style="color: ${c2};">Packages: <span style='color: #ffffff'>0</span>
<span style="color: ${c2};">Shell: <span style='color: #ffffff'>Bash</span>
<span style="color: ${c2};">Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}</span>`,
        opera: (c1: string, c2: string, browserName: string, user: string, dividerBar: string, uptime: string) => `
<span style="color: ${c1}">${user}@${browserName}</span>
<span style="color: #ffffff">${dividerBar}</span>
<span style="color: ${c2};">OS: <span style='color: #ffffff'>Browser</span>
<span style="color: ${c2};">Host: <span style='color: #ffffff'>${navigator.vendor}</span>
<span style="color: ${c2};">Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}</span>
<span style="color: ${c2};">Uptime: <span style='color: #ffffff'>${uptime}</span>
<span style="color: ${c2};">Packages: <span style='color: #ffffff'>0</span>
<span style="color: ${c2};">Shell: <span style='color: #ffffff'>Bash</span>
<span style="color: ${c2};">Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}</span>`,
        edge: (c1: string, c2: string, browserName: string, user: string, dividerBar: string, uptime: string) => `
<span style="color: ${c1}">${user}@${browserName}</span>
<span style="color: #ffffff">${dividerBar}</span>
<span style="color: ${c2};">OS: <span style='color: #ffffff'>Browser</span>
<span style="color: ${c2};">Host: <span style='color: #ffffff'>${navigator.vendor}</span>
<span style="color: ${c2};">Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}</span>
<span style="color: ${c2};">Uptime: <span style='color: #ffffff'>${uptime}</span>
<span style="color: ${c2};">Packages: <span style='color: #ffffff'>0</span>
<span style="color: ${c2};">Shell: <span style='color: #ffffff'>Bash</span>
<span style="color: ${c2};">Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}</span>`,
        browser: (c1: string, c2: string, browserName: string, user: string, dividerBar: string, uptime: string) => `
<span style="color: ${c1}">${user}@${browserName}</span>
<span style="color: #ffffff">${dividerBar}</span>
<span style="color: ${c2};">OS: <span style='color: #ffffff'>Browser</span>
<span style="color: ${c2};">Host: <span style='color: #ffffff'>${navigator.vendor}</span>
<span style="color: ${c2};">Kernel: <span style='color: #ffffff'>${window.navigator.userAgent.split(" ")[0]}</span>
<span style="color: ${c2};">Uptime: <span style='color: #ffffff'>${uptime}</span>
<span style="color: ${c2};">Packages: <span style='color: #ffffff'>0</span>
<span style="color: ${c2};">Shell: <span style='color: #ffffff'>Bash</span>
<span style="color: ${c2};">Resolution: <span style='color: #ffffff'>${window.screen.width}x${window.screen.height}</span>`
    };

    const asciiColors: Record<string, any> = {
        chrome: [
            "</span><span style='color: #34a853'>",
            "</span><span style='color: #ea4335'>",
            "</span><span style='color: #fbbc05'>",
            "</span><span style='color: #4285f4'>",
            "</span><span style='color: #ffffff'>"
        ],
        safari: [
            "</span><span style='color: #15b40c'>",
            "</span><span style='color: #f9f0a4'>",
            "</span><span style='color: #e74957'>",
            "</span><span style='color: #e74957'>",
            "</span><span style='color: #b5019e'>",
            "</span><span style='color: #3b78ff'>"
        ],
        firefox: ["#e10f67", "#fb912c"],
        opera: ["#fa4a4a", "#af0510"],
        edge: ["#46d369", "#0980d0"],
        browser: ["#a9a9a9", "#dfdfdf"]
    };

    // MARK: - State variables

    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [command, setCommand] = useState("");
    const [output, setOutput] = useState<OutputItem[]>([]);
    const [outputAfterInput, setOutputAfterInput] = useState("");
    const [mode, setMode] = useState("normal");
    const [isNanoOpen, setIsNanoOpen] = useState(false);
    const [nanoMode, setNanoMode] = useState<{
        active: boolean;
        fileName: string;
        isNewFile: boolean;
        content: string;
        cursorPosition: number;
        hasUnsavedChanges: boolean;
        statusMessage: string;
        showExitPrompt: boolean;
    }>({
        active: false,
        fileName: "",
        isNewFile: false,
        content: "",
        cursorPosition: 0,
        hasUnsavedChanges: false,
        statusMessage: "",
        showExitPrompt: false
    });

    const [resetWarningMode, setResetWarningMode] = useState<{
        active: boolean;
        step: number; // 1 = first warning, 2 = final confirmation
    }>({
        active: false,
        step: 1
    });

    const nanoTextareaRef = useRef<HTMLTextAreaElement>(null);
    const nanoPromptRef = useRef<HTMLDivElement>(null);
    const [historyPosition, setHistoryPosition] = useState(-1);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [tabPosition, setTabPosition] = useState(0);
    const [firstTab, setFirstTab] = useState(true);

    // Password mode states
    const [passwordMode, setPasswordMode] = useState<{
        active: boolean;
        type: string;
        data?: any;
        prompt: string;
        attempts: number;
    }>({
        active: false,
        type: "",
        data: null,
        prompt: "",
        attempts: 0
    });

    const [sudoCache, setSudoCache] = useState<{
        [userId: number]: {
            authenticated: boolean;
            timestamp: number;
        };
    }>({});

    const hasSudoAccess = (userId: number): boolean => {
        const cache = sudoCache[userId];
        if (!cache || !cache.authenticated) {
            return false;
        }

        return true;
    };

    const grantSudoAccess = (userId: number) => {
        setSudoCache((prev) => ({
            ...prev,
            [userId]: {
                authenticated: true,
                timestamp: Date.now()
            }
        }));
    };

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [suggestionPosition, setSuggestionPosition] = useState({ x: 0, y: 0 });

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const terminalBodyRef = useRef<HTMLDivElement>(null);
    const [startDate] = useState(new Date());

    const [previousState, setPreviousState] = useState({
        x: 100,
        y: 100,
        width: 600,
        height: 400
    });

    // Browser detection
    const getBrowserName = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes("Opera") || userAgent.includes("Opr")) return "opera";
        if (userAgent.includes("Edg")) return "edge";
        if (userAgent.includes("Chrome")) return "chrome";
        if (userAgent.includes("Safari")) return "safari";
        if (userAgent.includes("Firefox")) return "firefox";
        return "browser";
    };

    const [browserName] = useState(getBrowserName());
    const [fileSystem, setFileSystem] = useState<Record<string, FileSystemNode>>({
        "/": {
            type: "directory",
            children: {
                home: {
                    type: "directory",
                    children: {
                        user: {
                            type: "directory",
                            children: {
                                Desktop: {
                                    type: "directory",
                                    children: {
                                        "document.txt": { type: "file", content: "Hello World!" },
                                        "script.sh": { type: "file", content: '#!/bin/bash\necho "Hello from script"' }
                                    }
                                },
                                Documents: {
                                    type: "directory",
                                    children: {
                                        "readme.md": { type: "file", content: "# README\nThis is a test file" }
                                    }
                                },
                                ".bashrc": { type: "file", content: "export PATH=$PATH:/usr/local/bin" },
                                ".bash_history": { type: "file", content: "" },
                                ".bash_aliases": {
                                    type: "file",
                                    content: "# User aliases\n# alias ll='ls -la'\n# alias grep='grep --color=auto'"
                                }
                            }
                        },
                        exelvi: {
                            type: "directory",
                            children: {
                                ".bashrc": { type: "file", content: "export PATH=$PATH:/usr/local/bin" },
                                ".bash_history": { type: "file", content: "" },
                                ".bash_aliases": {
                                    type: "file",
                                    content: "# User aliases\nalias ll='ls -la'\nalias la='ls -A'\nalias l='ls -CF'"
                                }
                            }
                        }
                    }
                },
                etc: {
                    type: "directory",
                    children: {
                        passwd: {
                            type: "file",
                            content:
                                "root:x:0:0:root:/root:/bin/bash\nexelvi:x:1000:1000:exelvi:/home/exelvi:/bin/bash\nuser:x:1001:1001:user:/home/user:/bin/bash"
                        },
                        hosts: { type: "file", content: "127.0.0.1 localhost\n::1 localhost" },
                        motd: {
                            type: "file",
                            content: `Welcome to the Terminal!

Type 'help' to see all available commands.`
                        }
                    }
                },
                usr: {
                    type: "directory",
                    children: {
                        bin: {
                            type: "directory",
                            children: {
                                ls: { type: "file", content: "binary" },
                                cat: { type: "file", content: "binary" }
                            }
                        }
                    }
                },
                tmp: {
                    type: "directory",
                    children: {}
                },
                root: {
                    type: "directory",
                    children: {
                        ".bashrc": { type: "file", content: "export PATH=$PATH:/usr/local/bin" },
                        ".bash_history": { type: "file", content: "" },
                        ".bash_aliases": {
                            type: "file",
                            content:
                                "# Root aliases\nalias ll='ls -la'\nalias rm='rm -i'\nalias cp='cp -i'\nalias mv='mv -i'"
                        }
                    }
                }
            }
        }
    });

    const [currentPath, setCurrentPath] = useState("/home/user");
    const [currentUser, setCurrentUser] = useState("user");

    const [settings, setSettings] = useState({
        users: [
            {
                name: "exelvi",
                password: "password",
                UID: 1000,
                home: "/home/exelvi",
                permissions: {
                    "/home/exelvi": ["r", "w", "x"],
                    "/": ["r"]
                }
            },
            {
                name: "root",
                password: "ifyoucanreadthisyouareahacker",
                UID: 0,
                home: "/root",
                permissions: {
                    "/": ["r", "w", "x"]
                }
            },
            {
                name: "user",
                password: "user123",
                UID: 1001,
                home: "/home/user",
                permissions: {
                    "/home/user": ["r", "w", "x"],
                    "/": ["r"]
                }
            }
        ],
        currentUser: 1000,
        colors: false,
        lastUser: 1000
    });

    const [stats, setStats] = useState({
        commands: {} as Record<string, number>, // commands executed since the start
        files: 0, //files created since the start
        directories: 0, //directories created since the start
        sudo: 0, //sudo commands executed since the start
        users: 0, //users created since the start
        screenshots: {} as Record<string, number>, //screenshots taken since the start
        uptime: 0, //time since the start
        errors: [] as any[] //JS errors since the start
    });

    // State for alias management
    const [aliases, setAliases] = useState<Record<string, string>>({});

    // MARK: - LocalStorage functions

    // Salva tutto lo stato in localStorage
    const saveToLocalStorage = useCallback(() => {
        try {
            const stateToSave = {
                fileSystem,
                settings,
                stats,
                currentPath,
                currentUser,
                aliases,
                output: output.slice(-100), // Salva solo gli ultimi 100 output per non appesantire
                commandHistory: commandHistory.slice(-50), // Salva solo gli ultimi 50 comandi
                lastSaved: new Date().toISOString(),
                // Aggiungi posizione, dimensione e stato del terminale
                terminalPosition: previousState,
                terminalMaximized: isMaximized,
                terminalMinimized: isMinimized
            };

            localStorage.setItem("terminalState", JSON.stringify(stateToSave));
            localStorage.setItem("terminalFileSystem", JSON.stringify(fileSystem));
            localStorage.setItem("terminalSettings", JSON.stringify(settings));
            localStorage.setItem("terminalStats", JSON.stringify(stats));
        } catch (error) {
            console.warn("Failed to save terminal state to localStorage:", error);
        }
    }, [
        fileSystem,
        settings,
        stats,
        currentPath,
        currentUser,
        aliases,
        output,
        commandHistory,
        previousState,
        isMaximized,
        isMinimized
    ]);

    // Carica tutto lo stato da localStorage
    const loadFromLocalStorage = useCallback(() => {
        try {
            const savedState = localStorage.getItem("terminalState");
            if (savedState) {
                const parsedState = JSON.parse(savedState);

                // Carica gli stati uno per uno per evitare problemi di sincronizzazione
                if (parsedState.fileSystem) {
                    setFileSystem(parsedState.fileSystem);
                }
                if (parsedState.settings) {
                    setSettings(parsedState.settings);
                }
                if (parsedState.stats) {
                    setStats(parsedState.stats);
                }
                if (parsedState.currentPath) {
                    setCurrentPath(parsedState.currentPath);
                }
                if (parsedState.currentUser) {
                    setCurrentUser(parsedState.currentUser);
                }
                if (parsedState.aliases) {
                    setAliases(parsedState.aliases);
                }
                if (parsedState.output && Array.isArray(parsedState.output)) {
                    setOutput(parsedState.output);
                }
                if (parsedState.commandHistory && Array.isArray(parsedState.commandHistory)) {
                    setCommandHistory(parsedState.commandHistory);
                }
                // Carica posizione, dimensione e stato del terminale
                if (parsedState.terminalPosition) {
                    setPreviousState(parsedState.terminalPosition);
                }
                if (typeof parsedState.terminalMaximized === "boolean") {
                    setIsMaximized(parsedState.terminalMaximized);
                }
                if (typeof parsedState.terminalMinimized === "boolean") {
                    setIsMinimized(parsedState.terminalMinimized);
                }

                return true;
            }
        } catch (error) {
            console.warn("Failed to load terminal state from localStorage:", error);
        }
        return false;
    }, []);

    // MARK: - Functions

    // Utility functions
    const formatMilliseconds = (ms: number, short = false) => {
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds %= 60;
        minutes %= 60;

        let result = [];
        if (hours > 0) {
            result.push(hours + (short ? " h " : " hour" + (hours > 1 ? "s" : "")));
        }
        if (minutes > 0) {
            result.push(minutes + (short ? " m" : " minute" + (minutes > 1 ? "s" : "")));
        }
        if (seconds > 0 || result.length === 0) {
            result.push(seconds + (short ? "s " : " second" + (seconds > 1 ? "s" : "")));
        }

        return result.join(" and ");
    };
    // Funzione per ottenere il nome del file dal path
    const getFileName = (path: string): string => {
        const name = path.split("/").pop();
        return name || "";
    };

    const normalizePath = (path: string) => {
        // console.log(`Normalizing path: ${path}`, "typeof:", typeof path);
        // Gestione della tilde (~)
        if (path.startsWith("~")) {
            const user = settings.users.find((u) => u.UID === settings.currentUser);
            if (user) {
                path = path.replace("~", user.home);
            }
        }

        // Se il path non inizia con /, è relativo
        if (!path.startsWith("/")) {
            path = currentPath + "/" + path;
        }

        // Dividi il path in parti
        const parts = path.split("/").filter((part) => part !== "");
        const normalizedParts = [];

        for (const part of parts) {
            if (part === "..") {
                // Vai alla directory parent
                if (normalizedParts.length > 0) {
                    normalizedParts.pop();
                }
            } else if (part !== ".") {
                // Aggiungi la parte (ignora '.')
                normalizedParts.push(part);
            }
        }

        // Ricostruisci il path
        return "/" + normalizedParts.join("/");
    };

    // Funzione principale di navigazione
    const navigateToPath = (path: string, parent = false): FileSystemNode | false => {
        const normalizedPath = normalizePath(path);

        const targetPath = parent
            ? normalizedPath.substring(0, normalizedPath.lastIndexOf("/")) || "/"
            : normalizedPath;

        // Naviga attraverso il filesystem
        const pathParts = targetPath === "/" ? [] : targetPath.substring(1).split("/");
        let current = fileSystem["/"];

        for (const part of pathParts) {
            if (current.type !== "directory" || !current.children || !current.children[part]) {
                return false; // Path non trovato
            }
            current = current.children[part];
        }

        return current;
    };

    const fileSystemFunctions = {
        changeFileContent: function (path: string, content: string) {
            const file = navigateToPath(path);
            if (file && file.type === "file") {
                const parentDir = navigateToPath(path, true);
                const fileName = getFileName(normalizePath(path));
                if (parentDir && parentDir.children) {
                    parentDir.children[fileName].content = content;
                    return true;
                }
            }
            return false;
        },

        remove: function (path: string) {
            const parentDir = navigateToPath(path, true);
            const fileName = getFileName(normalizePath(path));
            if (parentDir && parentDir.children && parentDir.children[fileName]) {
                delete parentDir.children[fileName];
                return true;
            }
            return false;
        },

        createFile: function (path: string, content = "") {
            const parentDir = navigateToPath(path, true);
            const fileName = getFileName(normalizePath(path));
            if (parentDir && parentDir.children) {
                parentDir.children[fileName] = { type: "file", content: content };
                setStats((prev) => ({ ...prev, files: prev.files + 1 }));
                return true;
            }
            return false;
        },

        createDirectory: function (path: string) {
            const parentDir = navigateToPath(path, true);
            const dirName = getFileName(normalizePath(path));
            if (parentDir && parentDir.children) {
                parentDir.children[dirName] = { type: "directory", children: {} };
                setStats((prev) => ({ ...prev, directories: prev.directories + 1 }));
                return true;
            }
            return false;
        },

        readFileContent: function (path: string): string | false {
            const file = navigateToPath(path);
            if (file && file.type === "file") {
                return file.content || "";
            }
            return false;
        },

        getBashHistory: function () {
            const userObj = settings.users.find((u) => u.UID === settings.currentUser);
            if (!userObj) return "";

            const historyPath = `${userObj.home}/.bash_history`;
            let content = this.readFileContent(historyPath);

            if (content === false) {
                this.createFile(historyPath, "");
                content = "";
            }

            return content;
        },

        addToBashHistory: function (command: string) {
            const userObj = settings.users.find((u) => u.UID === settings.currentUser);
            if (!userObj) return false;

            const historyPath = `${userObj.home}/.bash_history`;
            let currentHistory = this.getBashHistory();

            const newHistory = currentHistory ? currentHistory + command + "\n" : command + "\n";

            // Crea il file se non esiste o aggiornalo
            if (!this.readFileContent(historyPath)) {
                this.createFile(historyPath, newHistory);
            } else {
                this.changeFileContent(historyPath, newHistory);
            }

            return true;
        },

        // Alias management functions
        getBashAliases: function () {
            const userObj = settings.users.find((u) => u.UID === settings.currentUser);
            if (!userObj) return "";

            const aliasPath = `${userObj.home}/.bash_aliases`;
            let content = this.readFileContent(aliasPath);

            if (content === false) {
                this.createFile(aliasPath, "");
                content = "";
            }

            return content;
        },

        saveBashAliases: function (aliasesContent: string) {
            const userObj = settings.users.find((u) => u.UID === settings.currentUser);
            if (!userObj) return false;

            const aliasPath = `${userObj.home}/.bash_aliases`;

            // Crea il file se non esiste o aggiornalo
            if (!this.readFileContent(aliasPath)) {
                this.createFile(aliasPath, aliasesContent);
            } else {
                this.changeFileContent(aliasPath, aliasesContent);
            }

            return true;
        },

        parseAliases: function () {
            const aliasesContent = this.getBashAliases();
            const aliasesObj: Record<string, string> = {};

            if (!aliasesContent) return aliasesObj;

            const lines = aliasesContent.split("\n");
            lines.forEach((line: string) => {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith("#")) {
                    // alias name='command'
                    const aliasMatch = trimmedLine.match(/^alias\s+([^=]+)=(.+)$/);
                    if (aliasMatch) {
                        const aliasName = aliasMatch[1].trim();
                        let aliasValue = aliasMatch[2].trim();

                        // cava e virgolette (se ci sono)
                        if (
                            (aliasValue.startsWith('"') && aliasValue.endsWith('"')) ||
                            (aliasValue.startsWith("'") && aliasValue.endsWith("'"))
                        ) {
                            aliasValue = aliasValue.slice(1, -1);
                        }

                        aliasesObj[aliasName] = aliasValue;
                    }
                }
            });

            return aliasesObj;
        },

        addAlias: function (name: string, command: string) {
            const currentAliases: Record<string, string> = this.parseAliases();
            currentAliases[name] = command;

            let newContent = "";
            Object.entries(currentAliases).forEach(([aliasName, aliasCommand]) => {
                newContent += `alias ${aliasName}='${aliasCommand}'\n`;
            });

            this.saveBashAliases(newContent);
            return true;
        },

        removeAlias: function (name: string) {
            const currentAliases: Record<string, string> = this.parseAliases();
            delete currentAliases[name];

            let newContent = "";
            Object.entries(currentAliases).forEach(([aliasName, aliasCommand]) => {
                newContent += `alias ${aliasName}='${aliasCommand}'\n`;
            });

            this.saveBashAliases(newContent);
            return true;
        },

        copy: function (source: string, destination: string) {
            const sourceObj = navigateToPath(source);
            if (!sourceObj) {
                throw new Error("Source path not found");
            }

            const destinationDir = navigateToPath(destination, true);
            const fileName = getFileName(normalizePath(destination));

            if (!destinationDir || !destinationDir.children) {
                throw new Error("Destination path not found");
            }

            destinationDir.children[fileName] = JSON.parse(JSON.stringify(sourceObj));
            return true;
        },

        move: function (source: string, destination: string) {
            this.copy(source, destination);
            this.remove(source);
            return true;
        },

        tree: function (path: string, indent = "") {
            let treeOutput = "";
            const target = navigateToPath(path);

            if (!target || target.type !== "directory" || !target.children) {
                throw new Error("Path not found or is not a directory");
            }

            const keys = Object.keys(target.children);
            keys.forEach((key, index) => {
                const isLast = index === keys.length - 1;
                treeOutput += indent + (isLast ? "└── " : "├── ") + key + "\n";

                if (target.children![key].type === "directory") {
                    const newPath = normalizePath(path + "/" + key);
                    treeOutput += this.tree(newPath, indent + (isLast ? "    " : "│   "));
                }
            });

            return treeOutput;
        },

        list: function (path = currentPath) {
            // console.log(`Listing contents of path: ${path}`);
            const target = navigateToPath(path);
            if (!target || target.type !== "directory" || !target.children) {
                return false;
            }

            return Object.keys(target.children).map((name) => ({
                name,
                type: target.children![name].type,
                ...(target.children![name].type === "file" && { size: target.children![name].content?.length || 0 })
            }));
        },

        exists: function (path: string) {
            return navigateToPath(path) !== false;
        },

        isDirectory: function (path: string) {
            const target = navigateToPath(path);
            return target && target.type === "directory";
        },

        isFile: function (path: string) {
            const target = navigateToPath(path);
            return target && target.type === "file";
        }
    };

    // Funzione per cambiare directory (cd)
    const changeDirectory = (path: string) => {
        const normalizedPath = normalizePath(path);
        const target = navigateToPath(normalizedPath);

        if (target && target.type === "directory") {
            setCurrentPath(normalizedPath);
            return true;
        }
        return false;
    };

    // Carica la history dal filesystem
    const loadHistoryFromFile = useCallback(() => {
        const historyContent = fileSystemFunctions.getBashHistory();
        if (historyContent) {
            const commands = historyContent.split("\n").filter((cmd: string) => cmd.trim() !== "");
            setCommandHistory(commands);
        }
    }, [fileSystem, settings.currentUser]);

    // Carica gli alias dal filesystem
    const loadAliasesFromFile = useCallback(() => {
        const aliasesObj = fileSystemFunctions.parseAliases();
        setAliases(aliasesObj);
    }, [fileSystem, settings.currentUser]);

    useEffect(() => {
        loadHistoryFromFile();
        loadAliasesFromFile();
    }, [loadHistoryFromFile, loadAliasesFromFile, settings.currentUser]);

    useEffect(() => {
        const wasLoaded = loadFromLocalStorage();
        if (!wasLoaded) {
            // if there is nothing in localStorage, show the motd (first load)
            const motd = fileSystemFunctions.readFileContent("/etc/motd");
            if (motd) {
                setOutput([
                    {
                        type: "output",
                        content: motd.replace(/\n/g, "<br>")
                    }
                ]);
            }
        }
    }, [loadFromLocalStorage]);

    //autosave
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            saveToLocalStorage();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [
        fileSystem,
        settings,
        stats,
        currentPath,
        currentUser,
        aliases,
        output,
        commandHistory,
        previousState,
        isMaximized,
        isMinimized,
        saveToLocalStorage
    ]);
 
    useEffect(() => {
        const interval = setInterval(() => {
            setStats((prev) => ({
                ...prev,
                uptime: new Date().getTime() - startDate.getTime()
            }));
        }, 30000); // 30s

        return () => clearInterval(interval);
    }, [startDate]);

    // MARK: - Autocomplete and suggestions 
    const getAutocompleteSuggestions = (input: string) => {
        const parts = input.trim().split(" ");
        const commandPart = parts[0];
        const currentArg = parts[parts.length - 1];
        const argIndex = parts.length - 1;
 
        if (argIndex === 0) { 
            const commandSuggestions = commands
                .filter((cmd) => cmd.name.startsWith(commandPart))
                .map((cmd) => ({ type: "command", value: cmd.name, display: cmd.name }));

            const aliasSuggestions = Object.keys(aliases)
                .filter((aliasName) => aliasName.startsWith(commandPart))
                .map((aliasName) => ({
                    type: "alias",
                    value: aliasName,
                    display: `${aliasName} (${aliases[aliasName]})`
                }));

            return [...commandSuggestions, ...aliasSuggestions];
        }

        let cmd = commands.find((c) => c.name === commandPart);
        if (!cmd) { 
            return getPathCompletions(currentArg, false);
        } else {
            const suggestions = cmd.autocomplete ? cmd.autocomplete(currentArg) : []; 
            return suggestions.map((suggestion) => ({
                ...suggestion,
                argIndex: argIndex,
                parentCommand: commandPart
            }));
        }

        return [];
    };

    const getPathCompletions = (partial?: string, directoriesOnly = false) => {
        try {
            if (!partial) partial = "";

            let basePath, searchTerm;

            let workingPartial = partial;
            if (partial.startsWith("~")) {
                const user = settings.users.find((u) => u.UID === settings.currentUser);
                if (user) {
                    workingPartial = partial.replace("~", user.home);
                }
            } 
            if (workingPartial.includes("/")) {
                const lastSlashIndex = workingPartial.lastIndexOf("/");
                basePath = workingPartial.substring(0, lastSlashIndex + 1);
                searchTerm = workingPartial.substring(lastSlashIndex + 1);
            } else {
                basePath = currentPath + "/";
                searchTerm = workingPartial;
            }
 
            const normalizedBasePath = normalizePath(basePath);

            // check if basePath exists and is a directory
            const baseNode = navigateToPath(normalizedBasePath);
            if (!baseNode || baseNode.type !== "directory") {
                return [];
            }
 
            const matches = Object.entries(baseNode.children || {})
                .filter(([name, node]) => { 
                    if (directoriesOnly && node.type !== "directory") {
                        return false;
                    } 
                    return name.startsWith(searchTerm);
                })
                .map(([name, node]) => { 
                    let fullPath;
                    if (partial && partial.startsWith("~")) {
                        fullPath = partial.substring(0, partial.lastIndexOf("/") + 1) + name;
                    } else if (partial && partial.startsWith("/")) {
                        fullPath = basePath + name;
                    } else {
                        fullPath =
                            (basePath === currentPath + "/" ? "" : basePath.replace(currentPath + "/", "")) + name;
                    }
 
                    if (node.type === "directory" && !fullPath.endsWith("/")) {
                        fullPath += "/";
                    }

                    return {
                        type: node.type,
                        value: fullPath,
                        display: `${name}${node.type === "directory" ? "/" : ""}`,
                        isDirectory: node.type === "directory"
                    };
                });

            return matches;
        } catch (error) {
            console.error("Error in path completion:", error);
            return [];
        }
    };

    // Applica il completamento
    const applyCompletion = (input: string, completion: any) => {
        const parts = input.trim().split(" ");

        if (completion.type === "command" && !completion.parentCommand) { 
            parts[0] = completion.value;
        } else if (completion.argIndex !== undefined) { 
            parts[completion.argIndex] = completion.value;
        } else { 
            parts[parts.length - 1] = completion.value;
        }

        return parts.join(" ");
    };
 
    const findCommonPrefix = (completions: any[]) => {
        if (completions.length === 0) return "";
        if (completions.length === 1) return completions[0].value;

        const first = completions[0].value;
        let commonLength = 0;

        // console.log(completions);

        for (let i = 0; i < first.length; i++) {
            const char = first[i];
            if (completions.every((comp: any) => comp.value[i] === char)) {
                commonLength++;
            } else {
                break;
            }
        }

        return first.substring(0, commonLength);
    };

    // Dropdown position calculation
    const calculateSuggestionPosition = () => {
        if (!inputRef.current) return { x: 0, y: 0 };

        const inputRect = inputRef.current.getBoundingClientRect();
        const containerRect = inputRef.current?.closest(".bg-black")?.getBoundingClientRect() || {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        };

        return {
            x: inputRect.left - containerRect.left,
            y: inputRect.bottom - containerRect.top + 5
        };
    };


    // MARK: - Commands
    const commands: Command[] = [
        {
            name: "help",
            description: "List all available commands",
            category: "utils",
            root: false,
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");

                const usage = document.createElement("div");
                usage.innerHTML = `<span style="color: #00ffff; font-weight: bold;">USAGE:</span>
    <span style="color: #ffffff;">command [options] [arguments]</span>`;
                output.appendChild(usage);

                const categoryColors: Record<string, string> = {
                    navigation: "#00ffff",
                    filesystem: "#ff6b6b",
                    text: "#4ecdc4",
                    system: "#45b7d1",
                    network: "#96ceb4",
                    utils: "#ffeaa7",
                    development: "#dda0dd",
                    other: "#888888"
                };

                const commandsByCategory: Record<string, Command[]> = {};

                commands.forEach((command) => {
                    const category = command.category || "other";
                    if (!commandsByCategory[category]) {
                        commandsByCategory[category] = [];
                    }
                    commandsByCategory[category].push(command);
                });

                const categoryOrder = [
                    "navigation",
                    "filesystem",
                    "text",
                    "system",
                    "network",
                    "utils",
                    "development",
                    "other"
                ];

                categoryOrder.forEach((categoryName) => {
                    const categoryCommands = commandsByCategory[categoryName];

                    if (categoryCommands && categoryCommands.length > 0) {
                        categoryCommands.sort((a, b) => a.name.localeCompare(b.name));

                        const categoryHeader = document.createElement("div");
                        const displayName = categoryName.toUpperCase();
                        const color = categoryColors[categoryName] || "#888888";
                        categoryHeader.innerHTML = `<br><span style="color: ${color}; font-weight: bold;">${displayName}:</span>`;
                        output.appendChild(categoryHeader);

                        categoryCommands.forEach((command) => {
                            const commandOutput = document.createElement("div");
                            const cmdName = command.name.padEnd(12);
                            let description = command.description;

                            if (description.length > 50) {
                                description = description.substring(0, 47) + "...";
                            }

                            commandOutput.innerHTML = `    <span style="color: #ffffff; font-weight: bold;">${cmdName}</span> <span style="color: #aaaaaa;">${description}</span>`;
                            output.appendChild(commandOutput);
                        });
                    }
                });

                const footer = document.createElement("div");
                footer.innerHTML = `<br><span style="color: #555;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>
<span style="color: #ffff00;">TIP:</span> Press <span style="color: #00ff00;">TAB</span> for autocompletion
<span style="color: #ffff00;">TIP:</span> Use <span style="color: #00ff00;">history</span> to see previous commands`;
                output.appendChild(footer);

                return output;
            }
        },
        {
            name: "clear",
            root: false,
            description: "Clear the terminal",
            category: "utils",
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");
                setOutput([]);
                return output;
            }
        },
        {
            name: "date",
            root: false,
            description: "Prints the current date and time",
            category: "system",
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");
                output.textContent = new Date().toLocaleString();
                return output;
            }
        },
        {
            //
            name: "touch",
            root: false,
            description: "Create an empty file or update the timestamp of an existing file",
            category: "filesystem",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.textContent = "touch: missing file operand";
                    return output;
                }
 
                for (let i = 1; i < params.length; i++) {
                    const targetPath = params[i];
                    const normalizedPath = normalizePath(targetPath);

                    if (fileSystemFunctions.exists(normalizedPath)) { 
                        continue;
                    }

                    try {
                        if (fileSystemFunctions.createFile(normalizedPath, "")) { 
                            setFileSystem({ ...fileSystem });
                        } else {
                            output.innerHTML += `touch: cannot touch '${targetPath}': No such file or directory<br>`;
                        }
                    } catch (error) {
                        output.innerHTML += `touch: cannot touch '${targetPath}': ${(error as Error).message}<br>`;
                    }
                }

                return output;
            }
        },
        {
            name: "rm",
            root: false,
            description: "Delete a file or directory",
            category: "filesystem",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.textContent = "rm: missing operand";
                    return output;
                }

                const isRecursive = params.includes("-r") || params.includes("-rf");
                const isForce = params.includes("-f") || params.includes("-rf");

                // Filtra i flag per ottenere solo i path
                const targetPaths = params.slice(1).filter((p: string) => !p.startsWith("-"));

                for (const targetPath of targetPaths) {
                    const normalizedPath = normalizePath(targetPath);

                    if (!fileSystemFunctions.exists(normalizedPath)) {
                        if (!isForce) {
                            output.innerHTML += `rm: cannot remove '${targetPath}': No such file or directory<br>`;
                        }
                        continue;
                    }

                    if (fileSystemFunctions.isDirectory(normalizedPath) && !isRecursive) {
                        output.innerHTML += `rm: cannot remove '${targetPath}': Is a directory<br>`;
                        continue;
                    }

                    try {
                        fileSystemFunctions.remove(normalizedPath);
                        setFileSystem({ ...fileSystem });
                    } catch (error) {
                        output.innerHTML += `rm: cannot remove '${targetPath}': ${(error as Error).message}<br>`;
                    }
                }

                return output;
            }
        },
        {
            name: "cat",
            root: false,
            description: "Display the content of a file",
            category: "text",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const filePath = input.split(" ")[1];

                if (!filePath) {
                    output.textContent = "cat: missing file operand";
                    return output;
                }
                try {
                    let content = fileSystemFunctions.readFileContent(filePath);
                    if (!fileSystemFunctions.exists(filePath)) {
                        throw new Error("No such file or directory");
                    }
                    if (!fileSystemFunctions.isFile(filePath)) {
                        throw new Error("Is a directory");
                    }

                    if (!content) content = " ";

                    output.textContent = content;
                    return output;
                } catch (error) {
                    output.textContent = `cat: ${filePath}: ${(error as Error).message}`;
                    return output;
                }
            }
        },
        {
            name: "echo",
            root: false,
            description: "Display text",
            category: "text",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.innerHTML = "<br>";
                    return output;
                }

                output.textContent = params.slice(1).join(" ");
                return output;
            }
        },
        {
            name: "ls",
            root: false,
            description: "List files in the current directory.",
            category: "navigation",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, true);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                // Parse flags
                let showAll = false; // -A flag
                let showHidden = false; // -a flag (includes . and ..)
                let classify = false; // -F or -CF flag
                let longFormat = false; // -l flag
                let targetPath = currentPath;
 
                for (let i = 1; i < params.length; i++) {
                    const param = params[i];
                    if (param.startsWith("-")) {
                        if (param.includes("a") && !param.includes("A")) showHidden = true;
                        if (param.includes("A")) showAll = true;
                        if (param.includes("l")) longFormat = true;
                        if (param.includes("F") || param.includes("C")) classify = true;
                    } else {
                        targetPath = param;
                        break;
                    }
                }

                const normalizedPath = normalizePath(targetPath);

                if (!fileSystemFunctions.exists(normalizedPath)) {
                    output.textContent = `ls: cannot access '${targetPath}': No such file or directory`;
                    return output;
                }

                if (!fileSystemFunctions.isDirectory(normalizedPath)) {
                    output.textContent = `ls: ${targetPath}: Not a directory`;
                    return output;
                }

                const node = navigateToPath(normalizedPath);
                if (!node || node.type !== "directory" || !node.children) {
                    output.textContent = `ls: cannot access '${targetPath}': No such file or directory`;
                    return output;
                }

                let items = Object.entries(node.children).map(([name, item]) => ({
                    name,
                    type: item.type
                }));
 
                if (!showHidden && !showAll) { 
                    items = items.filter((item) => !item.name.startsWith("."));
                } else if (showAll) { 
                    items = items.filter((item) => item.name !== "." && item.name !== "..");
                } 
 
                items.sort((a, b) => a.name.localeCompare(b.name));

                if (longFormat) { 
                    items.forEach(function (item) {
                        const span = document.createElement("span");
                        if (item.type === "directory") {
                            span.style.color = "#3f65bd";
                        }
                        span.innerHTML = item.name + "<br>";
                        output.appendChild(span);
                    });
                } else if (classify) { 
                    items.forEach(function (item) {
                        const span = document.createElement("span");
                        let displayName = item.name;

                        if (item.type === "directory") {
                            span.style.color = "#3f65bd";
                            displayName += "/";  
                        }

                        span.innerHTML = displayName + " ";
                        output.appendChild(span);
                    });
                } else {
                    // Default
                    items.forEach(function (item) {
                        const span = document.createElement("span");
                        if (item.type === "directory") {
                            span.style.color = "#3f65bd";
                        }
                        span.innerHTML = item.name + " ";
                        output.appendChild(span);
                    });
                }

                return output;
            }
        },
        {
            name: "cd",
            root: false,
            description: "Change the current directory",
            category: "navigation",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, true);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const directoryName = input.split(" ")[1];
                if (!directoryName) { 
                    const homeDir = settings.users.find((u) => u.UID === settings.currentUser)?.home || "/home/user";
                    const navResult = changeDirectory(homeDir);
                    if (!navResult) {
                        output.textContent = `cd: ${homeDir}: No such file or directory`;
                        return output;
                    }
                } else {
                    const navResult = changeDirectory(directoryName);
                    if (!navResult) {
                        output.textContent = `cd: ${directoryName}: No such file or directory`;
                        return output;
                    }
                }

                return output;
            }
        },
        {
            name: "mkdir",
            root: false,
            description: "Create a new directory",
            category: "filesystem",

            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, true);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.textContent = "mkdir: missing operand";
                    return output;
                }
 
                for (let i = 1; i < params.length; i++) {
                    const targetPath = params[i];
                    const normalizedPath = normalizePath(targetPath);

                    if (fileSystemFunctions.exists(normalizedPath)) {
                        output.innerHTML += `mkdir: cannot create directory '${targetPath}': File exists<br>`;
                        continue;
                    }

                    try {
                        if (fileSystemFunctions.createDirectory(normalizedPath)) { 
                            setFileSystem({ ...fileSystem });
                        } else {
                            output.innerHTML += `mkdir: cannot create directory '${targetPath}': No such file or directory<br>`;
                        }
                    } catch (error) {
                        output.innerHTML += `mkdir: cannot create directory '${targetPath}': ${(error as Error).message}<br>`;
                    }
                }

                return output;
            }
        },
        {
            name: "mv",
            root: false,
            description: "Move a file or directory",
            category: "filesystem",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 3) {
                    output.textContent = "mv: missing file operand";
                    return output;
                }

                const sourcePath = params[params.length - 2];
                const destPath = params[params.length - 1];
                const normalizedSource = normalizePath(sourcePath);
                const normalizedDest = normalizePath(destPath);

                if (!fileSystemFunctions.exists(normalizedSource)) {
                    output.textContent = `mv: cannot stat '${sourcePath}': No such file or directory`;
                    return output;
                }

                try {
                    fileSystemFunctions.move(normalizedSource, normalizedDest);
                    setFileSystem({ ...fileSystem });
                } catch (error) {
                    output.textContent = `mv: ${(error as Error).message}`;
                }

                return output;
            }
        },
        {
            name: "cp",
            root: false,
            description: "Copy a file or directory",
            category: "filesystem",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 3) {
                    output.textContent = "cp: missing file operand";
                    return output;
                }

                const sourcePath = params[params.length - 2];
                const destPath = params[params.length - 1];
                const normalizedSource = normalizePath(sourcePath);
                const normalizedDest = normalizePath(destPath);

                if (!fileSystemFunctions.exists(normalizedSource)) {
                    output.textContent = `cp: cannot stat '${sourcePath}': No such file or directory`;
                    return output;
                }

                try {
                    fileSystemFunctions.copy(normalizedSource, normalizedDest);
                    setFileSystem({ ...fileSystem });
                } catch (error) {
                    output.textContent = `cp: ${(error as Error).message}`;
                }

                return output;
            }
        },
        {
            name: "pwd",
            root: false,
            description: "Print current directory path",
            category: "navigation",
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");
                output.textContent = currentPath;
                return output;
            }
        },
        {
            name: "whoami",
            root: false,
            description: "Print the current user",
            category: "system",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string, currentUser?: number) {
                const output = document.createElement("div");
                const user = settings.users.find((u) => u.UID === currentUser);
                if (user) {
                    output.textContent = user.name;
                } else {
                    output.textContent = "unknown";
                }
                return output;
            }
        },
        {
            name: "neofetch",
            root: false,
            description: "Print system information",
            category: "system",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string, currentUser?: number) {
                let output = document.createElement("div");
                var deviceName = currentUser + "@" + browserName;
                var dividerBar;
                if (deviceName.length % 2 == 0) {
                    dividerBar = "-".repeat(deviceName.length);
                } else {
                    dividerBar = "-".repeat(deviceName.length - 1);
                }

                output.innerHTML = ascii[browserName](
                    ...asciiColors[browserName],
                    browserName,
                    settings.users.find((u) => u.UID == currentUser)?.name || "unknown",
                    dividerBar,
                    formatMilliseconds(new Date().getTime() - startDate.getTime(), true)
                );

                return output;
            }
        },
        {
            name: "tree",
            description: "List the file system in a tree view",
            category: "navigation",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg || "", true);
            },
            execute: function (input: string) {
                var dir = input.split(" ")[1] || "/";
                const output = document.createElement("div");
                try {
                    const treeOutput = fileSystemFunctions.tree(dir);
                    output.innerHTML = `<pre>${dir}\n${treeOutput}</pre>`;
                } catch (error) {
                    output.textContent = `tree: ${dir}: No such file or directory`;
                }

                return output;
            }
        },
        {
            name: "stats",
            description: "Print terminal statistics",
            root: false,
            autocomplete: function () {
                return [];
            },
            execute: function (input: string) {
                var output = document.createElement("div");
                var args = input.split(" ");

                if (args[1] == "--help" || args[1] == "-h") {
                    output.textContent = `Usage: stats [OPTION]

Options:
    -c, --commands            display command statistics
    -s, --screenshots         display screenshot statistics
    -e, --errors              display error statistics
    -complete, -all           display all statistics
    -console                  display errors in console (only with -errors)`;
                    return output;
                }

                function randomReadableColor() {
                    do {
                        var r = Math.floor(Math.random() * 256);
                        var g = Math.floor(Math.random() * 256);
                        var b = Math.floor(Math.random() * 256);
                    } while (r + g + b < 60);
                    return { r, g, b };
                }

                let mostUsedCommand, totalCommands, totalScreenshots, totalErrors;

                if (Object.keys(stats.commands).length > 0) {
                    mostUsedCommand = Object.keys(stats.commands).reduce((a, b) =>
                        stats.commands[a] > stats.commands[b] ? a : b
                    );
                    totalCommands = Object.values(stats.commands).reduce((a, b) => a + b);
                } else {
                    mostUsedCommand = "N/A";
                    totalCommands = 0;
                }
                if (Object.keys(stats.screenshots).length > 0) {
                    totalScreenshots = Object.values(stats.screenshots).reduce((a, b) => a + b);
                } else {
                    totalScreenshots = 0;
                }
                if (Object.keys(stats.errors).length > 0) {
                    totalErrors = Object.values(stats.errors).length;
                } else {
                    totalErrors = 0;
                }

                output.innerHTML = `<span style="color: #ffffff">stats: ${args[1]}: invalid argument;</span>`;
                if (!args[1]) {
                    output.innerHTML = `<pre>
Total commands:     ${totalCommands}
Most used command:  ${mostUsedCommand} (${stats.commands[mostUsedCommand]} times)
Sudo commands:      ${stats.sudo || 0}
Screenshots:        ${totalScreenshots}
Time spent:         ${formatMilliseconds(stats.uptime)}
</pre>`;
                }

                if (args[1] === "-c" || args[1] === "-commands") {
                    var commandStats = Object.keys(stats.commands)
                        .sort((a, b) => stats.commands[b] - stats.commands[a])
                        .map((cmd) => {
                            return `${cmd}:${" ".repeat(15 - cmd.length)}${stats.commands[cmd]} times`;
                        })
                        .join("\n");

                    output.innerHTML = `<pre>
Most used command: ${mostUsedCommand} (${stats.commands[mostUsedCommand]} times)
Total commands: ${totalCommands}
-----------------------------------------------
Command statistics:
${commandStats}
</pre>`;
                }

                if (args[1] === "-screenshot" || args[1] === "-screenshots" || args[1] === "-s") {
                    var screenshotStats = Object.keys(stats.screenshots)
                        .map((date) => {
                            return `${date}:${" ".repeat(15 - date.length)}${stats.screenshots[date]} times`;
                        })
                        .join("\n");

                    output.innerHTML = `<pre>
Screenshots: ${totalScreenshots}
-----------------------------------------------
${screenshotStats}
</pre>`;
                }

                if (
                    args[1] === "-errors" ||
                    args[1] === "-e" ||
                    args[1] === "-error" ||
                    args[2] === "-e" ||
                    args[2] === "-errors" ||
                    args[2] === "-error"
                ) {
                    if (args[1] === "-console" || args[2] === "-console") console.log(stats.errors);
                    var errorStats = "";
                    for (let i = 0; i < Object.values(stats.errors).length; i++) {
                        errorStats += `${i}. ${Object.values(stats.errors)[i]?.message?.length > 48 ? Object.values(stats.errors)[i]?.message?.substring(0, 43) + "..." : Object.values(stats.errors)[i]?.message}\n`;
                    }
                    output.innerHTML = `<pre>
Errors: ${totalErrors}
-----------------------------------------------
${errorStats}
</pre>`;
                }

                if (args[1] === "-complete" || args[1] === "-all") {
                    var commandStats = Object.keys(stats.commands)
                        .map((cmd) => {
                            return `${cmd}:${" ".repeat(15 - cmd.length)}${stats.commands[cmd]} times`;
                        })
                        .join("\n");

                    var screenshotStats = Object.keys(stats.screenshots)
                        .map((date) => {
                            return `${date}:${" ".repeat(15 - date.length)}${stats.screenshots[date]} times`;
                        })
                        .join("\n");

                    output.innerHTML = `<pre>
Total commands:       ${totalCommands}
Most used command:    ${mostUsedCommand} (${stats.commands[mostUsedCommand]} times)
Sudo commands:        ${stats.sudo || 0}
Screenshots:          ${totalScreenshots}
Time spent:           ${formatMilliseconds(stats.uptime)}
Errors:               ${totalErrors}
Files created:        ${stats.files}
Directories created:  ${stats.directories}
</pre>`;
                }

                var startColor = randomReadableColor();
                var endColor = randomReadableColor();

                var steps = output.textContent.split("\n").length;

                let fade = [];
                for (let i = 0; i < steps; i++) {
                    fade.push(
                        `rgb(${startColor.r + (i * (endColor.r - startColor.r)) / steps}, ${startColor.g + (i * (endColor.g - startColor.g)) / steps}, ${startColor.b + (i * (endColor.b - startColor.b)) / steps})`
                    );
                }

                output.innerHTML = output.innerHTML
                    .split("\n")
                    .map((line, i) => `<span style="color: ${fade[i]}">${line}</span>`)
                    .join("<br>");

                return output;
            }
        },
        {
            name: "debug",
            description: "Debugging command for development",
            root: false,
            autocomplete: function () {
                return [
                    { value: "fs", display: "File System", type: "option" },
                    { value: "settings", display: "Settings", type: "option" },
                    { value: "history", display: "Command History", type: "option" }
                ];
            },
            execute: function (input: string) {
                var output = document.createElement("div");
                var args = input.split(" ");

                var debugs = {
                    fs: () => {
                        console.log(fileSystem);
                        return "File system logged to console";
                    },
                    settings: () => {
                        console.log(settings);
                        return "Settings logged to console";
                    },
                    history: () => {
                        console.log("Command History:", commandHistory);
                        console.log("History from file:", fileSystemFunctions.getBashHistory());
                        return "Command history logged to console";
                    }
                };

                if (args[1] && debugs[args[1] as keyof typeof debugs]) {
                    const result = debugs[args[1] as keyof typeof debugs]();
                    output.textContent = result;
                } else {
                    output.textContent = "Usage: debug [fs|settings|history]";
                }

                return output;
            }
        },
        {
            name: "nano",
            description: "Simple text editor",
            category: "text",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.textContent = "Usage: nano [filename]";
                    return output;
                }

                const filePath = params[1];
                const normalizedPath = normalizePath(filePath);

                let fileContent = "";
                let isNewFile = false;

                if (fileSystemFunctions.exists(normalizedPath)) {
                    if (fileSystemFunctions.isFile(normalizedPath)) {
                        const content = fileSystemFunctions.readFileContent(normalizedPath);
                        fileContent = content || "";
                    } else {
                        output.textContent = `nano: ${filePath}: Is a directory`;
                        return output;
                    }
                } else {
                    isNewFile = true;
                }
 
                setNanoMode({
                    active: true,
                    fileName: filePath,
                    isNewFile: isNewFile,
                    content: fileContent,
                    cursorPosition: 0,
                    hasUnsavedChanges: false,
                    statusMessage: "",
                    showExitPrompt: false
                });
                setIsNanoOpen(true);

                output.textContent = `Opening ${filePath} in nano...`;
                return output;
            }
        },
        {
            name: "history",
            root: false,
            description: "Display command history",
            category: "utils",
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");
                if (commandHistory.length === 0) {
                    output.textContent = "No commands in history.";
                    return output;
                }

                const historyList = commandHistory.map((cmd, index) => `${index + 1}  ${cmd}`).join("\n");
                output.innerHTML = `<pre>${historyList}</pre>`;
                return output;
            }
        },
        {
            name: "su",
            root: false,
            description: "Switch user",
            category: "system",
            autocomplete: function () {
                return settings.users.map((user) => ({
                    type: "user",
                    value: user.name,
                    display: user.name
                }));
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");
                const targetUser = params[1] || "root";

                const user = settings.users.find((u) => u.name === targetUser);
                if (!user) {
                    output.textContent = `su: user ${targetUser} does not exist`;
                    return output;
                }

                // if root, no password
                if (settings.currentUser === 0) {
                    setSettings((prev) => ({
                        ...prev,
                        lastUser: prev.currentUser,
                        currentUser: user.UID
                    }));
                    setCurrentUser(user.name);
                    setCurrentPath(user.home);
                    output.textContent = `Switched to user ${targetUser}`;
                    return output;
                }

                    // if user has no password, switch directly
                if (!user.password || user.password === "") {
                    setSettings((prev) => ({
                        ...prev,
                        lastUser: prev.currentUser,
                        currentUser: user.UID
                    }));
                    setCurrentUser(user.name);
                    setCurrentPath(user.home);
                    output.textContent = `Switched to user ${targetUser}`;
                    return output;
                }
 
                setPasswordMode({
                    active: true,
                    type: "su",
                    data: { targetUser: user },
                    prompt: "Password: ",
                    attempts: 0
                });

                return output;
            }
        },
        {
            name: "sudo",
            description: "Execute commands as another user",
            category: "system",
            root: false,
            autocomplete: function (currentArg?: string) { 
                if (!currentArg) {
                    return commands.map((cmd) => ({
                        type: "command",
                        value: cmd.name,
                        display: cmd.name + " - " + cmd.description
                    }));
                }
                return commands
                    .filter((cmd) => cmd.name.startsWith(currentArg))
                    .map((cmd) => ({
                        type: "command",
                        value: cmd.name,
                        display: cmd.name + " - " + cmd.description
                    }));
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");

                if (params.length < 2) {
                    output.textContent = "sudo: a command must be specified";
                    return output;
                }
 
                if (params[1] === "-k") { 
                    setSudoCache((prev) => ({
                        ...prev,
                        [settings.currentUser]: {
                            authenticated: false,
                            timestamp: Date.now()
                        }
                    }));
                    output.textContent = "sudo: cache cleared";
                    return output;
                }

                if (params[1] === "-v") { 
                    if (hasSudoAccess(settings.currentUser)) {
                        output.textContent = "sudo: valid authentication";
                    } else {
                        output.textContent = "sudo: no valid authentication";
                    }
                    return output;
                }
 
                const sudoCommand = params.slice(1).join(" ");
 
                if (settings.currentUser === 0) { 
                    const commandName = sudoCommand.split(" ")[0];
                    const command = commands.find((cmd) => cmd.name === commandName);

                    if (command) {
                        const result = command.execute(sudoCommand, 0); 
                        if (result) {
                            setOutput((prev) => [
                                ...prev,
                                {
                                    type: "output",
                                    content: result.innerHTML || result.textContent
                                }
                            ]);
                        }
                    } else {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: `${commandName}: command not found`
                            }
                        ]);
                    }
                    return output;
                }
 
                if (hasSudoAccess(settings.currentUser)) { 
                    const commandName = sudoCommand.split(" ")[0];
                    const command = commands.find((cmd) => cmd.name === commandName);

                    if (command) {
                        const tempCurrentUser = settings.currentUser;
                        setSettings((prev) => ({ ...prev, currentUser: 0 })); // Temporaneamente root

                        const result = command.execute(sudoCommand, 0);
                        if (result) {
                            setOutput((prev) => [
                                ...prev,
                                {
                                    type: "output",
                                    content: result.innerHTML || result.textContent
                                }
                            ]);
                        }

                        setSettings((prev) => ({ ...prev, currentUser: tempCurrentUser })); // Ripristina utente
                    } else {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: `${commandName}: command not found`
                            }
                        ]);
                    }
                    return output;
                }

                setPasswordMode({
                    active: true,
                    type: "sudo",
                    data: { command: sudoCommand },
                    prompt:
                        "[sudo] password for " +
                        (settings.users.find((u) => u.UID === settings.currentUser)?.name || "user") +
                        ": ",
                    attempts: 0
                });

                return output;
            }
        },
        {
            name: "passwd",
            description: "Change user password",
            category: "system",
            root: false,
            autocomplete: function () {
                return settings.users.map((user) => ({
                    type: "user",
                    value: user.name,
                    display: user.name
                }));
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ");
                let targetUser = params[1];

                if (!targetUser) {
                    targetUser = settings.users.find((u) => u.UID === settings.currentUser)?.name || "user";
                }

                const user = settings.users.find((u) => u.name === targetUser);

                if (!user) {
                    output.textContent = `passwd: user '${targetUser}' does not exist`;
                    return output;
                }

                if (settings.currentUser !== 0 && user.UID !== settings.currentUser) {
                    output.textContent = `passwd: permission denied`;
                    return output;
                }
 
                if (settings.currentUser !== 0 && user.password && user.password !== "") {
                    setPasswordMode({
                        active: true,
                        type: "passwd_current",
                        data: { targetUser: user },
                        prompt: "Current password: ",
                        attempts: 0
                    });
                } else { 
                    setPasswordMode({
                        active: true,
                        type: "passwd_new",
                        data: { targetUser: user },
                        prompt: "New password: ",
                        attempts: 0
                    });
                }

                return output;
            }
        },
        {
            name: "alias",
            root: false,
            description: "Create and manage command aliases",
            category: "utils",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.trim().split(" ");

                // alias senza parametri: mostra tutti gli alias
                if (params.length === 1) {
                    const currentAliases = fileSystemFunctions.parseAliases();

                    if (Object.keys(currentAliases).length === 0) {
                        output.textContent = "No aliases defined";
                        return output;
                    }

                    Object.entries(currentAliases).forEach(([name, command]) => {
                        const line = document.createElement("div");
                        line.textContent = `alias ${name}='${command}'`;
                        output.appendChild(line);
                    });

                    return output;
                }

                const aliasDefinition = params.slice(1).join(" ");

                // alias name='command'
                const aliasMatch = aliasDefinition.match(/^([^=]+)=(.+)$/);

                if (aliasMatch) {
                    const aliasName = aliasMatch[1].trim();
                    let aliasCommand = aliasMatch[2].trim();
 
                    if (
                        (aliasCommand.startsWith('"') && aliasCommand.endsWith('"')) ||
                        (aliasCommand.startsWith("'") && aliasCommand.endsWith("'"))
                    ) {
                        aliasCommand = aliasCommand.slice(1, -1);
                    }
 
                    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(aliasName)) {
                        output.textContent = `alias: invalid alias name '${aliasName}'`;
                        return output;
                    }
 
                    const existingCommand = commands.find((cmd) => cmd.name === aliasName);
                    if (existingCommand) {
                        output.textContent = `alias: cannot alias '${aliasName}': command already exists`;
                        return output;
                    }
 
                    try {
                        fileSystemFunctions.addAlias(aliasName, aliasCommand);
 
                        const updatedAliases = fileSystemFunctions.parseAliases();
                        setAliases(updatedAliases);

                        output.textContent = `alias ${aliasName}='${aliasCommand}'`;
                    } catch (error) {
                        output.textContent = `alias: error creating alias: ${(error as Error).message}`;
                    }

                    return output;
                }
 
                const aliasName = aliasDefinition.trim();
                const currentAliases = fileSystemFunctions.parseAliases();

                if (currentAliases[aliasName]) {
                    output.textContent = `alias ${aliasName}='${currentAliases[aliasName]}'`;
                } else {
                    output.textContent = `alias: ${aliasName}: not found`;
                }

                return output;
            }
        },
        {
            name: "unalias",
            root: false,
            description: "Remove alias definitions",
            category: "utils",
            autocomplete: function () {
                const currentAliases = fileSystemFunctions.parseAliases();
                return Object.keys(currentAliases).map((aliasName) => ({
                    type: "alias",
                    value: aliasName,
                    display: aliasName
                }));
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.trim().split(" ");

                if (params.length < 2) {
                    output.textContent = "unalias: usage: unalias [-a] name [name ...]";
                    return output;
                }

                // unalias -a: rimuove tutti gli alias
                if (params[1] === "-a") {
                    try {
                        fileSystemFunctions.saveBashAliases("");
                        setAliases({});
                        output.textContent = "All aliases removed";
                    } catch (error) {
                        output.textContent = `unalias: error removing aliases: ${(error as Error).message}`;
                    }
                    return output;
                }
 
                const aliasesToRemove = params.slice(1);
                const currentAliases = fileSystemFunctions.parseAliases();
                let removedCount = 0;
                let notFoundAliases: string[] = [];

                aliasesToRemove.forEach((aliasName: string) => {
                    if (currentAliases[aliasName]) {
                        try {
                            fileSystemFunctions.removeAlias(aliasName);
                            removedCount++;
                        } catch (error) {
                            output.innerHTML += `unalias: error removing '${aliasName}': ${(error as Error).message}<br>`;
                        }
                    } else {
                        notFoundAliases.push(aliasName);
                    }
                });

                if (removedCount > 0) {
                    // Ricarica gli alias nel state
                    const updatedAliases = fileSystemFunctions.parseAliases();
                    setAliases(updatedAliases);
                }

                if (notFoundAliases.length > 0) {
                    notFoundAliases.forEach((aliasName: string) => {
                        output.innerHTML += `unalias: ${aliasName}: not found<br>`;
                    });
                }

                if (removedCount > 0 && notFoundAliases.length === 0) {
                    output.textContent = `${removedCount} alias${removedCount > 1 ? "es" : ""} removed`;
                }

                return output;
            }
        },
        {
            name: "screenshot",
            description: "Take a screenshot of the terminal",
            root: false,
            category: "utils",
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");
 
                const terminalElement = terminalBodyRef.current;
                if (!terminalElement) {
                    output.textContent = "Error: Cannot access terminal for screenshot";
                    return output;
                }

                handleScreenshot();
 
                return document.createElement("div");
            }
        },
        {
            name: "load-state",
            description: "Load terminal state from a JSON file",
            root: false,
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const output = document.createElement("div");

                // Crea un input file nascosto
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".json";
                fileInput.style.display = "none";

                fileInput.onchange = (event) => {
                    const target = event.target as HTMLInputElement;
                    const file = target.files?.[0];

                    if (!file) {
                        output.textContent = "No file selected";
                        output.style.color = "#ff0";
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const content = e.target?.result as string;
                            const stateData = JSON.parse(content);
 
                            if (!stateData.fileSystem || !stateData.settings || !stateData.version) {
                                output.textContent = "Invalid state file format";
                                output.style.color = "#f00";
                                return;
                            }
 
                            if (stateData.fileSystem) setFileSystem(stateData.fileSystem);
                            if (stateData.settings) setSettings(stateData.settings);
                            if (stateData.stats) setStats(stateData.stats);
                            if (stateData.currentPath) setCurrentPath(stateData.currentPath);
                            if (stateData.currentUser) setCurrentUser(stateData.currentUser);
                            if (stateData.aliases) setAliases(stateData.aliases);
                            if (stateData.outputHistory) setOutput(stateData.outputHistory);
                            if (stateData.commandHistory) setCommandHistory(stateData.commandHistory);

                            output.innerHTML = `<span style='color: #0f0'>Terminal state loaded successfully from: ${file.name}</span><br><span style='color: #ff0'>Note: Page refresh recommended for full effect</span>`;
                        } catch (error) {
                            output.textContent = `Failed to load state: ${(error as any).message}`;
                            output.style.color = "#f00";
                        }
                    };

                    reader.readAsText(file);
                };
 
                fileInput.click();
 
                output.textContent = "Select a JSON state file to load...";
                output.style.color = "#0ff";

                return output;
            }
        },
        {
            name: "export-state",
            description: "Export terminal state as downloadable JSON file",
            root: false,
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const outputDiv = document.createElement("div");
                try {
                    const stateToExport = {
                        fileSystem,
                        settings,
                        stats,
                        currentPath,
                        currentUser,
                        aliases,
                        outputHistory: output.slice(-50), // Ultimi 50 output
                        commandHistory: commandHistory.slice(-100), // Ultimi 100 comandi
                        exportDate: new Date().toISOString(),
                        version: "1.0"
                    };

                    const blob = new Blob([JSON.stringify(stateToExport, null, 2)], {
                        type: "application/json"
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
                    link.href = url;
                    link.download = `terminal-state-${timestamp}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    outputDiv.innerHTML = `<span style='color: #0f0'>Terminal state exported as: terminal-state-${timestamp}.json</span>`;
                } catch (error) {
                    outputDiv.textContent = `Failed to export state: ${(error as any).message}`;
                    outputDiv.style.color = "#f00";
                }
                return outputDiv;
            }
        },
        {
            name: "storage-info",
            description: "Show localStorage usage information",
            root: false,
            autocomplete: function () {
                return [];
            },
            execute: function () {
                const outputDiv = document.createElement("div");

                try {
                    // Calcola dimensioni
                    const terminalState = localStorage.getItem("terminalState");
                    const fileSystemState = localStorage.getItem("terminalFileSystem");
                    const settingsState = localStorage.getItem("terminalSettings");
                    const statsState = localStorage.getItem("terminalStats");

                    const sizeInBytes = (str: string | null) => (str ? new Blob([str]).size : 0);
                    const formatBytes = (bytes: number) => {
                        if (bytes === 0) return "0 Bytes";
                        const k = 1024;
                        const sizes = ["Bytes", "KB", "MB", "GB"];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
                    };

                    const terminalStateSize = sizeInBytes(terminalState);
                    const fileSystemSize = sizeInBytes(fileSystemState);
                    const settingsSize = sizeInBytes(settingsState);
                    const statsSize = sizeInBytes(statsState);
                    const totalSize = terminalStateSize + fileSystemSize + settingsSize + statsSize;

                    // Stima quota localStorage (credo tra i 5-10MB)
                    let availableSpace = "Unknown";
                    try {
                        const test = "x".repeat(1024); // 1KB  
                        let i = 0;
                        while (i < 10000) {
                            // Max 10MB test
                            try {
                                localStorage.setItem("__storage_test__", test.repeat(i));
                                localStorage.removeItem("__storage_test__");
                                i += 1024; // Incrementa di 1MB
                            } catch {
                                availableSpace = formatBytes((i - 1024) * 1024);
                                break;
                            }
                        }
                    } catch (e) { 
                        // Ignora errori 
                    }

                    outputDiv.innerHTML = `<pre style="color: #ffffff">
LocalStorage Usage Information:
===============================
Terminal State:    ${formatBytes(terminalStateSize)}
File System:       ${formatBytes(fileSystemSize)}  
Settings:          ${formatBytes(settingsSize)}
Statistics:        ${formatBytes(statsSize)}
-------------------------------
Total Used:        ${formatBytes(totalSize)}
Available Space:   ~${availableSpace}

Status: ${terminalState ? '<span style="color: #0f0">State Saved</span>' : '<span style="color: #f00">No Saved State</span>'}
Last Saved: ${terminalState ? JSON.parse(terminalState).lastSaved || "Unknown" : "Never"}
</pre>`;
                } catch (error) {
                    outputDiv.textContent = `Failed to get storage info: ${(error as any).message}`;
                    outputDiv.style.color = "#f00";
                }

                return outputDiv;
            }
        },
        {
            name: "tar",
            description: "Create or extract tar archives",
            root: false,
            category: "utils",
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1); // Remove 'tar'

                if (params.length < 2) {
                    output.textContent =
                        "tar: usage: tar [options] archive [files...]\nOptions:\n  -c: create archive\n  -x: extract archive\n  -v: verbose\n  -f: specify filename\n  -t: list contents\nExample: tar -cvf archive.tar file1.txt file2.txt";
                    return output;
                }

                let create = false,
                    extract = false,
                    verbose = false,
                    list = false;
                let archiveName = "";
                let files: string[] = [];

                // Parse options
                for (let i = 0; i < params.length; i++) {
                    const param = params[i];
                    if (param.startsWith("-")) {
                        if (param.includes("c")) create = true;
                        if (param.includes("x")) extract = true;
                        if (param.includes("v")) verbose = true;
                        if (param.includes("t")) list = true;
                        if (param.includes("f")) {
                            // Next parameter is the filename
                            if (i + 1 < params.length) {
                                archiveName = params[i + 1];
                                i++; // Skip next parameter
                            }
                        }
                    } else if (!archiveName) {
                        archiveName = param;
                    } else {
                        files.push(param);
                    }
                }

                if (!archiveName) {
                    output.textContent = "tar: no archive name specified";
                    return output;
                }

                const archivePath = normalizePath(archiveName);

                if (create) { 
                    if (files.length === 0) {
                        output.textContent = "tar: no files specified for archive";
                        return output;
                    }

                    const archiveData: any = {
                        type: "tar",
                        created: new Date().toISOString(),
                        files: {}
                    };

                    let totalSize = 0;
                    for (const file of files) {
                        const filePath = normalizePath(file);
                        const fileNode = navigateToPath(filePath);

                        if (!fileNode) {
                            output.textContent = `tar: ${file}: No such file or directory`;
                            return output;
                        }

                        if (fileNode.type === "file") {
                            archiveData.files[file] = {
                                type: "file",
                                content: fileNode.content || "",
                                size: (fileNode.content || "").length
                            };
                            totalSize += (fileNode.content || "").length;
                            if (verbose) {
                                output.innerHTML += `${file}\n`;
                            }
                        } else if (fileNode.type === "directory") { 
                            const addDirectory = (dirPath: string, dirNode: FileSystemNode, prefix: string = "") => {
                                if (dirNode.children) {
                                    for (const [name, child] of Object.entries(dirNode.children)) {
                                        const fullPath = prefix ? `${prefix}/${name}` : name;
                                        const displayPath = file === "." ? fullPath : `${file}/${fullPath}`;

                                        if (child.type === "file") {
                                            archiveData.files[displayPath] = {
                                                type: "file",
                                                content: child.content || "",
                                                size: (child.content || "").length
                                            };
                                            totalSize += (child.content || "").length;
                                            if (verbose) {
                                                output.innerHTML += `${displayPath}\n`;
                                            }
                                        } else if (child.type === "directory") {
                                            archiveData.files[displayPath] = { type: "directory" };
                                            addDirectory(displayPath, child, fullPath);
                                            if (verbose) {
                                                output.innerHTML += `${displayPath}/\n`;
                                            }
                                        }
                                    }
                                }
                            };

                            archiveData.files[file] = { type: "directory" };
                            addDirectory(file, fileNode);
                            if (verbose) {
                                output.innerHTML += `${file}/\n`;
                            }
                        }
                    }
 
                    const archiveContent = JSON.stringify(archiveData);
                    if (fileSystemFunctions.createFile(archivePath, archiveContent)) {
                        if (!verbose) {
                            output.textContent = `Created archive: ${archiveName} (${Object.keys(archiveData.files).length} items, ${totalSize} bytes)`;
                        }
                        setStats((prev: any) => ({ ...prev, files: prev.files + 1 }));
                    } else {
                        output.textContent = `tar: cannot create archive ${archiveName}`;
                    }
                } else if (extract) { 
                    const archiveContent = fileSystemFunctions.readFileContent(archivePath);
                    if (!archiveContent) {
                        output.textContent = `tar: ${archiveName}: No such file or directory`;
                        return output;
                    }

                    try {
                        const archiveData = JSON.parse(archiveContent);
                        if (archiveData.type !== "tar") {
                            output.textContent = `tar: ${archiveName}: not a valid tar archive`;
                            return output;
                        }

                        let extracted = 0; 
                        const sortedFiles = Object.entries(archiveData.files).sort(([a], [b]) => a.localeCompare(b));

                        for (const [filePath, fileData] of sortedFiles) {
                            const fullPath = normalizePath(filePath);

                            if ((fileData as any).type === "directory") {
                                if (fileSystemFunctions.createDirectory(fullPath)) {
                                    extracted++;
                                    if (verbose) {
                                        output.innerHTML += `${filePath}/\n`;
                                    }
                                }
                            } else if ((fileData as any).type === "file") {
                                if (fileSystemFunctions.createFile(fullPath, (fileData as any).content || "")) {
                                    extracted++;
                                    if (verbose) {
                                        output.innerHTML += `${filePath}\n`;
                                    }
                                }
                            }
                        }

                        if (!verbose) {
                            output.textContent = `Extracted ${extracted} items from ${archiveName}`;
                        }

                        setStats((prev: any) => ({ ...prev, files: prev.files + extracted }));
                    } catch (error) {
                        output.textContent = `tar: ${archiveName}: invalid archive format`;
                    }
                } else if (list) { 
                    const archiveContent = fileSystemFunctions.readFileContent(archivePath);
                    if (!archiveContent) {
                        output.textContent = `tar: ${archiveName}: No such file or directory`;
                        return output;
                    }

                    try {
                        const archiveData = JSON.parse(archiveContent);
                        if (archiveData.type !== "tar") {
                            output.textContent = `tar: ${archiveName}: not a valid tar archive`;
                            return output;
                        }

                        for (const [filePath, fileData] of Object.entries(archiveData.files)) {
                            if ((fileData as any).type === "directory") {
                                output.innerHTML += `${filePath}/\n`;
                            } else {
                                const size = (fileData as any).size || 0;
                                if (verbose) {
                                    output.innerHTML += `${filePath} (${size} bytes)\n`;
                                } else {
                                    output.innerHTML += `${filePath}\n`;
                                }
                            }
                        }
                    } catch (error) {
                        output.textContent = `tar: ${archiveName}: invalid archive format`;
                    }
                } else {
                    output.textContent = "tar: you must specify either -c (create), -x (extract), or -t (list)";
                }

                return output;
            }
        },
        {
            name: "zip",
            description: "Create zip archives",
            category: "utils",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1); // Remove 'zip'

                if (params.length < 2) {
                    output.textContent =
                        "zip: usage: zip [-r] archive.zip [files...]\nOptions:\n  -r: recursive (include directories)\nExample: zip -r archive.zip folder/ file.txt";
                    return output;
                }

                let recursive = false;
                let archiveName = "";
                let files: string[] = [];

                // Parse parameters
                for (const param of params) {
                    if (param === "-r") {
                        recursive = true;
                    } else if (!archiveName) {
                        archiveName = param;
                    } else {
                        files.push(param);
                    }
                }

                if (!archiveName || files.length === 0) {
                    output.textContent = "zip: missing archive name or files";
                    return output;
                }

                const archivePath = normalizePath(archiveName);

                // Create zip archive (similar to tar but with different format)
                const archiveData: any = {
                    type: "zip",
                    created: new Date().toISOString(),
                    compressed: true,
                    files: {}
                };

                let totalSize = 0;
                let compressedSize = 0;

                for (const file of files) {
                    const filePath = normalizePath(file);
                    const fileNode = navigateToPath(filePath);

                    if (!fileNode) {
                        output.textContent = `zip: ${file}: No such file or directory`;
                        return output;
                    }

                    if (fileNode.type === "file") {
                        const content = fileNode.content || "";

                        // we use Pako for real deflate compression
                        const compress = (text: string): { compressed: string; ratio: number } => {
                            if (!text) return { compressed: "", ratio: 0 };

                            try { 
                                const textEncoder = new TextEncoder();
                                const data = textEncoder.encode(text);
 
                                const compressed = pako.deflate(data);
 
                                const compressedBase64 = btoa(String.fromCharCode(...compressed));

                                const ratio =
                                    text.length > 0
                                        ? Math.round(((text.length - compressed.length) / text.length) * 100)
                                        : 0;

                                return { compressed: compressedBase64, ratio: Math.max(0, ratio) };
                            } catch (error) {
                                console.warn("Compression failed, using original:", error);
                                return { compressed: btoa(text), ratio: 0 };
                            }
                        };

                        const compressionResult = compress(content);

                        archiveData.files[file] = {
                            type: "file",
                            compressed: compressionResult.compressed,
                            originalSize: content.length,
                            compressedSize: compressionResult.compressed.length,
                            actuallyCompressed: compressionResult.ratio > 0
                        };

                        totalSize += content.length;
                        compressedSize += compressionResult.compressed.length;

                        if (compressionResult.ratio > 0) {
                            output.innerHTML += `  adding: ${file} (deflated ${compressionResult.ratio}%)\n`;
                        } else {
                            output.innerHTML += `  adding: ${file} (stored)\n`;
                        }
                    } else if (fileNode.type === "directory" && recursive) { 
                        const addDirectory = (dirPath: string, dirNode: FileSystemNode, prefix: string = "") => {
                            if (dirNode.children) {
                                for (const [name, child] of Object.entries(dirNode.children)) {
                                    const fullPath = prefix ? `${prefix}/${name}` : name;
                                    const displayPath = file === "." ? fullPath : `${file}/${fullPath}`;

                                    if (child.type === "file") {
                                        const content = child.content || "";
 
                                        const compress = (text: string): { compressed: string; ratio: number } => {
                                            if (!text) return { compressed: "", ratio: 0 };

                                            try { 
                                                const textEncoder = new TextEncoder();
                                                const data = textEncoder.encode(text);
 
                                                const compressed = pako.deflate(data);
 
                                                const compressedBase64 = btoa(String.fromCharCode(...compressed));

                                                const ratio =
                                                    text.length > 0
                                                        ? Math.round(
                                                              ((text.length - compressed.length) / text.length) * 100
                                                          )
                                                        : 0;

                                                return { compressed: compressedBase64, ratio: Math.max(0, ratio) };
                                            } catch (error) {
                                                console.warn("Compression failed, using original:", error);
                                                return { compressed: btoa(text), ratio: 0 };
                                            }
                                        };

                                        const compressionResult = compress(content);

                                        archiveData.files[displayPath] = {
                                            type: "file",
                                            compressed: compressionResult.compressed,
                                            originalSize: content.length,
                                            compressedSize: compressionResult.compressed.length,
                                            actuallyCompressed: compressionResult.ratio > 0
                                        };

                                        totalSize += content.length;
                                        compressedSize += compressionResult.compressed.length;

                                        if (compressionResult.ratio > 0) {
                                            output.innerHTML += `  adding: ${displayPath} (deflated ${compressionResult.ratio}%)\n`;
                                        } else {
                                            output.innerHTML += `  adding: ${displayPath} (stored)\n`;
                                        }
                                    } else if (child.type === "directory") {
                                        archiveData.files[displayPath] = { type: "directory" };
                                        addDirectory(displayPath, child, fullPath);
                                        output.innerHTML += `  adding: ${displayPath}/\n`;
                                    }
                                }
                            }
                        };

                        archiveData.files[file] = { type: "directory" };
                        addDirectory(file, fileNode);
                        output.innerHTML += `  adding: ${file}/\n`;
                    } else if (fileNode.type === "directory" && !recursive) {
                        output.textContent = `zip: ${file}: is a directory (use -r for recursive)`;
                        return output;
                    }
                }
 
                const archiveContent = JSON.stringify(archiveData);
                if (fileSystemFunctions.createFile(archivePath, archiveContent)) {
                    const ratio = totalSize > 0 ? Math.round(((totalSize - compressedSize) / totalSize) * 100) : 0;
                    const actualRatio = Math.max(0, ratio);  

                    output.innerHTML += `\nCreated: ${archiveName} (${Object.keys(archiveData.files).length} files, ${totalSize} → ${compressedSize} bytes`;

                    if (compressedSize < totalSize) {
                        output.innerHTML += `, ${actualRatio}% compression)`;
                    } else if (compressedSize === totalSize) {
                        output.innerHTML += `, no compression)`;
                    } else {
                        output.innerHTML += `, stored)`;
                    }

                    setStats((prev: any) => ({ ...prev, files: prev.files + 1 }));
                } else {
                    output.textContent = `zip: cannot create archive ${archiveName}`;
                }

                return output;
            }
        },
        {
            name: "unzip",
            description: "Extract zip archives",
            category: "utils",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1); // Remove 'unzip'

                if (params.length < 1) {
                    output.textContent =
                        "unzip: usage: unzip [-l] archive.zip\nOptions:\n  -l: list contents without extracting\nExample: unzip archive.zip";
                    return output;
                }

                let listOnly = false;
                let archiveName = "";

                // Parse parameters
                for (const param of params) {
                    if (param === "-l") {
                        listOnly = true;
                    } else if (!archiveName) {
                        archiveName = param;
                    }
                }

                if (!archiveName) {
                    output.textContent = "unzip: no archive specified";
                    return output;
                }

                const archivePath = normalizePath(archiveName);
                const archiveContent = fileSystemFunctions.readFileContent(archivePath);

                if (!archiveContent) {
                    output.textContent = `unzip: cannot find or open ${archiveName}`;
                    return output;
                }

                try {
                    const archiveData = JSON.parse(archiveContent);
                    if (archiveData.type !== "zip") {
                        output.textContent = `unzip: ${archiveName}: not a valid zip archive`;
                        return output;
                    }

                    if (listOnly) {
                        // List contents
                        output.innerHTML = `Archive:  ${archiveName}\n`;
                        let totalOriginalSize = 0;
                        let totalCompressedSize = 0;

                        for (const [filePath, fileData] of Object.entries(archiveData.files)) {
                            if ((fileData as any).type === "directory") {
                                output.innerHTML += `        0  ${new Date(archiveData.created).toLocaleString()}   ${filePath}/\n`;
                            } else {
                                const originalSize = (fileData as any).originalSize || 0;
                                const compressedSize = (fileData as any).compressedSize || 0;
                                totalOriginalSize += originalSize;
                                totalCompressedSize += compressedSize;

                                const ratio =
                                    originalSize > 0
                                        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
                                        : 0;
                                const displayRatio = Math.max(0, ratio);

                                if ((fileData as any).ratio > 0) {
                                    output.innerHTML += `${originalSize.toString().padStart(8)}  ${new Date(archiveData.created).toLocaleString()}   ${filePath} (${displayRatio}%)\n`;
                                } else {
                                    output.innerHTML += `${originalSize.toString().padStart(8)}  ${new Date(archiveData.created).toLocaleString()}   ${filePath} (stored)\n`;
                                }
                            }
                        }

                        const overallRatio =
                            totalOriginalSize > 0
                                ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
                                : 0;
                        const displayOverallRatio = Math.max(0, overallRatio);
                        output.innerHTML += `--------                  -------\n${totalOriginalSize.toString().padStart(8)}                  ${Object.keys(archiveData.files).length} files (${displayOverallRatio}% compression)`;
                    } else {
                        // Extract files
                        output.innerHTML = `Archive:  ${archiveName}\n`;
                        let extracted = 0;

                        // Sort by path to create directories first
                        const sortedFiles = Object.entries(archiveData.files).sort(([a], [b]) => a.localeCompare(b));

                        for (const [filePath, fileData] of sortedFiles) {
                            const fullPath = normalizePath(filePath);

                            if ((fileData as any).type === "directory") {
                                if (fileSystemFunctions.createDirectory(fullPath)) {
                                    extracted++;
                                    output.innerHTML += `  creating: ${filePath}/\n`;
                                }
                            } else if ((fileData as any).type === "file") {
                                try { 
                                    const decompress = (compressedBase64: string): string => {
                                        if (!compressedBase64) return "";

                                        try { 
                                            const compressed = Uint8Array.from(atob(compressedBase64), (c) =>
                                                c.charCodeAt(0)
                                            );
 
                                            const decompressed = pako.inflate(compressed);
 
                                            const textDecoder = new TextDecoder();
                                            return textDecoder.decode(decompressed);
                                        } catch (error) {
                                            console.warn("Decompression failed, trying as plain text:", error); 
                                            return atob(compressedBase64);
                                        }
                                    };

                                    const decompressed = decompress((fileData as any).compressed || "");
                                    if (fileSystemFunctions.createFile(fullPath, decompressed)) {
                                        extracted++;
                                        output.innerHTML += `  inflating: ${filePath}\n`;
                                    }
                                } catch (error) {
                                    output.innerHTML += `  error extracting: ${filePath}\n`;
                                }
                            }
                        }

                        output.innerHTML += `\nExtracted ${extracted} files from ${archiveName}`;
                        setStats((prev: any) => ({ ...prev, files: prev.files + extracted }));
                    }
                } catch (error) {
                    output.textContent = `unzip: ${archiveName}: invalid archive format`;
                }

                return output;
            }
        },
        {
            name: "find",
            description: "Search for files and directories",
            category: "navigation",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, true);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1);

                let searchPath = currentPath;
                let namePattern = "";
                let typeFilter = "";

                // Parse parameters
                for (let i = 0; i < params.length; i++) {
                    const param = params[i];
                    if (param === "-name" && i + 1 < params.length) {
                        namePattern = params[i + 1]; 
                    } else if (param === "-type" && i + 1 < params.length) {
                        typeFilter = params[i + 1]; 
                    } else if (!param.startsWith("-")) {
                        searchPath = param;
                    }
                }

                const searchRecursive = (path: string, results: string[] = []): string[] => {
                    const normalizedPath = normalizePath(path);
                    const node = navigateToPath(normalizedPath);

                    if (!node) {
                        return results;
                    }

                    if (node.type === "directory" && node.children) { 
                        const dirName = path.split("/").pop() || "";
                        let matches = true;

                        if (namePattern && !new RegExp(namePattern.replace(/\*/g, ".*")).test(dirName)) {
                            matches = false;
                        }
                        if (typeFilter === "f") matches = false;  
                        if (typeFilter === "d") {
                            
                        }

                        if (matches && path !== searchPath) {
                            results.push(path);
                        }
 
                        Object.keys(node.children).forEach((childName) => {
                            const childPath = path === "/" ? `/${childName}` : `${path}/${childName}`;
                            const childNode = node.children![childName];

                            let childMatches = true;
                            if (namePattern && !new RegExp(namePattern.replace(/\*/g, ".*")).test(childName)) {
                                childMatches = false;
                            }
                            if (typeFilter === "f" && childNode.type !== "file") childMatches = false;
                            if (typeFilter === "d" && childNode.type !== "directory") childMatches = false;

                            if (childMatches) {
                                results.push(childPath);
                            }
 
                            if (childNode.type === "directory") {
                                searchRecursive(childPath, results);
                            }
                        });
                    }

                    return results;
                };

                const results = searchRecursive(searchPath);
                output.textContent = results.join("\n");
                return output;
            }
        },
        {
            name: "head",
            description: "Display first lines of a file",
            category: "text",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1);

                let numLines = 10;
                let fileName = "";

                // Parse parameters
                for (let i = 0; i < params.length; i++) {
                    const param = params[i];
                    if (param === "-n" && i + 1 < params.length) {
                        numLines = parseInt(params[i + 1]) || 10;
                        i++; 
                    } else if (param.startsWith("-") && /^\-\d+$/.test(param)) {
                        numLines = parseInt(param.substring(1)) || 10;
                    } else if (!fileName) {
                        fileName = param;
                    }
                }

                if (!fileName) {
                    output.textContent = "head: missing file operand";
                    return output;
                }

                const normalizedPath = normalizePath(fileName);
                const content = fileSystemFunctions.readFileContent(normalizedPath);

                if (content === "Permission denied") {
                    output.textContent = `head: cannot open '${fileName}' for reading: Permission denied`;
                    return output;
                }

                if (content === false) {
                    output.textContent = `head: cannot open '${fileName}' for reading: No such file or directory`;
                    return output;
                }

                const lines = content.split("\n");
                const displayLines = lines.slice(0, numLines);
                output.textContent = displayLines.join("\n");
                return output;
            }
        },
        {
            name: "tail",
            description: "Display last lines of a file",
            category: "text",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1);

                let numLines = 10;
                let fileName = "";

                // Parse parameters
                for (let i = 0; i < params.length; i++) {
                    const param = params[i];
                    if (param === "-n" && i + 1 < params.length) {
                        numLines = parseInt(params[i + 1]) || 10;
                        i++;  
                    } else if (param.startsWith("-") && /^\-\d+$/.test(param)) {
                        numLines = parseInt(param.substring(1)) || 10;
                    } else if (!fileName) {
                        fileName = param;
                    }
                }

                if (!fileName) {
                    output.textContent = "tail: missing file operand";
                    return output;
                }

                const normalizedPath = normalizePath(fileName);
                const content = fileSystemFunctions.readFileContent(normalizedPath);

                if (content === "Permission denied") {
                    output.textContent = `tail: cannot open '${fileName}' for reading: Permission denied`;
                    return output;
                }

                if (content === false) {
                    output.textContent = `tail: cannot open '${fileName}' for reading: No such file or directory`;
                    return output;
                }

                const lines = content.split("\n");
                const startIndex = Math.max(0, lines.length - numLines);
                const displayLines = lines.slice(startIndex);
                output.textContent = displayLines.join("\n");
                return output;
            }
        },
        {
            name: "wc",
            description: "Count lines, words, and characters",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1);

                let showLines = false;
                let showWords = false;
                let showChars = false;
                let files: string[] = [];

                // Parse parameters
                for (const param of params) {
                    if (param === "-l") {
                        showLines = true;
                    } else if (param === "-w") {
                        showWords = true;
                    } else if (param === "-c") {
                        showChars = true;
                    } else if (!param.startsWith("-")) {
                        files.push(param);
                    }
                }
 
                if (!showLines && !showWords && !showChars) {
                    showLines = showWords = showChars = true;
                }

                if (files.length === 0) {
                    output.textContent = "wc: missing file operand";
                    return output;
                }

                let results = "";
                let totalLines = 0,
                    totalWords = 0,
                    totalChars = 0;

                files.forEach((fileName) => {
                    const normalizedPath = normalizePath(fileName);
                    const content = fileSystemFunctions.readFileContent(normalizedPath);

                    if (content === "Permission denied") {
                        results += `wc: ${fileName}: Permission denied\n`;
                        return;
                    }

                    if (content === false) {
                        results += `wc: ${fileName}: No such file or directory\n`;
                        return;
                    }

                    const lines = content.split("\n");
                    const lineCount = lines.length;
                    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;
                    const charCount = content.length;

                    totalLines += lineCount;
                    totalWords += wordCount;
                    totalChars += charCount;

                    let line = "";
                    if (showLines) line += ` ${lineCount.toString().padStart(7)}`;
                    if (showWords) line += ` ${wordCount.toString().padStart(7)}`;
                    if (showChars) line += ` ${charCount.toString().padStart(7)}`;
                    line += ` ${fileName}`;

                    results += line.trim() + "\n";
                });
 
                if (files.length > 1) {
                    let totalLine = "";
                    if (showLines) totalLine += ` ${totalLines.toString().padStart(7)}`;
                    if (showWords) totalLine += ` ${totalWords.toString().padStart(7)}`;
                    if (showChars) totalLine += ` ${totalChars.toString().padStart(7)}`;
                    totalLine += " total";
                    results += totalLine.trim() + "\n";
                }

                output.textContent = results.trim();
                return output;
            }
        },
        {
            name: "sort",
            description: "Sort lines of text",
            category: "text",
            root: false,
            autocomplete: function (currentArg?: string) {
                return getPathCompletions(currentArg, false);
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const params = input.split(" ").slice(1);

                let reverse = false;
                let numeric = false;
                let unique = false;
                let fileName = "";
 
                for (const param of params) {
                    if (param === "-r") {
                        reverse = true;
                    } else if (param === "-n") {
                        numeric = true;
                    } else if (param === "-u") {
                        unique = true;
                    } else if (!param.startsWith("-")) {
                        fileName = param;
                    }
                }

                if (!fileName) {
                    output.textContent = "sort: missing file operand";
                    return output;
                }

                const normalizedPath = normalizePath(fileName);
                const content = fileSystemFunctions.readFileContent(normalizedPath);

                if (content === "Permission denied") {
                    output.textContent = `sort: cannot read: ${fileName}: Permission denied`;
                    return output;
                }

                if (content === false) {
                    output.textContent = `sort: cannot read: ${fileName}: No such file or directory`;
                    return output;
                }

                let lines = content.split("\n");

                // Remove duplicates if unique flag is set
                if (unique) {
                    lines = [...new Set(lines)];
                }

                // Sort lines
                lines.sort((a, b) => {
                    if (numeric) {
                        const numA = parseFloat(a) || 0;
                        const numB = parseFloat(b) || 0;
                        return reverse ? numB - numA : numA - numB;
                    } else {
                        return reverse ? b.localeCompare(a) : a.localeCompare(b);
                    }
                });

                output.textContent = lines.join("\n");
                return output;
            }
        },
        {
            name: "javascript",
            root: false,
            description: "Open a javascript console",
            category: "development",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string) {
                const output = document.createElement("div");
                const commands = input.split("javascript ")[1];
                if (commands) { 
                    const consoleLogs: string[] = [];

                    // Intercetta console.log
                    const originalConsoleLog = console.log;
                    console.log = (...args: any[]) => {
                        const logMessage = args
                            .map((arg) => {
                                if (typeof arg === "object") {
                                    return JSON.stringify(arg, null, 2);
                                }
                                return String(arg);
                            })
                            .join(" ");
                        consoleLogs.push(logMessage);
                    };

                    try {
                        const result = eval(commands);

                        // Ripristina console.log originale
                        console.log = originalConsoleLog;

                        // Mostra prima i console.log se ci sono
                        if (consoleLogs.length > 0) {
                            consoleLogs.forEach((logMessage, index) => {
                                const logSpan = document.createElement("div");
                                logSpan.innerHTML = `<span style="color: #87ceeb;">${logMessage}</span>`;
                                output.appendChild(logSpan);
                            });
                        }
 
                        if (result !== undefined) {
                            if (consoleLogs.length > 0) { 
                                const separator = document.createElement("div");
                                separator.innerHTML = "&nbsp;";
                                output.appendChild(separator);
                            }

                            if (typeof result === "boolean" || typeof result === "number") {
                                const span = document.createElement("span");
                                span.textContent = String(result);
                                if (settings.colors) span.style.color = "orange";
                                output.appendChild(span);
                            } else if (typeof result === "string") {
                                const span = document.createElement("span");
                                span.textContent = '"' + result + '"';
                                if (settings.colors) span.style.color = "green";
                                output.appendChild(span);
                            } else if (typeof result === "object") {
                                const span = document.createElement("span");
                                span.textContent = JSON.stringify(result, null, 2);
                                if (settings.colors) span.style.color = "blue";
                                output.appendChild(span);
                            } else {
                                const span = document.createElement("span");
                                span.textContent = String(result);
                                output.appendChild(span);
                            }
                        }
                        return output;
                    } catch (error) { 
                        console.log = originalConsoleLog;
                        output.innerHTML = `<span style="color: red;">Error: ${error}</span>`;
                        return output;
                    }
                } else {
                    output.innerHTML = `<span style="color: #ffff00;">Welcome to JavaScript Interactive Mode!</span>
<span style="color: #ffffff;">Type JavaScript commands to execute them.</span>
<span style="color: #00ff00;">Type .exit to return to normal mode.</span>
<span style="color: #888888;">Example: 2 + 2</span>`;
                    setMode("javascript");
                    return output;
                }
            }
        },
        {
            name: "exit",
            root: false,
            description: "Exit the terminal or return to previous user",
            category: "system",
            autocomplete: function () {
                return [];
            },
            execute: function (input: string, currentUser?: number) {
                const output = document.createElement("div");

                if (mode === "javascript") {
                    setMode("normal");
                    output.innerHTML = `<span style="color: #00ff00;">Exited JavaScript mode</span>`;
                    return output;
                }
 
                if (settings.currentUser !== settings.lastUser) {
                    const previousUser = settings.users.find((u) => u.UID === settings.lastUser);

                    if (previousUser) {
                        setSettings((prev) => ({
                            ...prev,
                            currentUser: previousUser.UID
                        }));
                        setCurrentUser(previousUser.name);
                        setCurrentPath(previousUser.home);

                        output.innerHTML = `<span style="color: #00ff00;">Returned to user: ${previousUser.name}</span>`;
                        return output;
                    }
                }
 
                if (onClose) {
                    output.innerHTML = `<span style="color: #ff6b6b;">Closing terminal...</span>`;
                    setTimeout(() => {
                        onClose();
                    }, 500);
                    return output;
                } else {
                    output.innerHTML = `<span style="color: #ffff00;">No parent process to return to. Use Ctrl+Alt+C to close the terminal.</span>`;
                    return output;
                }
            }
        }
    ];

    // MARK: - State and Handlers

    // Handle command execution
    const handleCommand = useCallback(
        (input: string) => {
            if (!input.trim()) return;
 
            //JS mode
            if (mode === "javascript") {
                if (input.trim() === ".exit") {
                    setMode("normal");
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: "> " + input
                        },
                        {
                            type: "success",
                            content: "Exited JavaScript mode"
                        }
                    ]);
                    return;
                }

                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: "> " + input
                    }
                ]);

                const consoleLogs: string[] = [];

                // Intercetta console.log
                const originalConsoleLog = console.log;
                console.log = (...args: any[]) => {
                    const logMessage = args
                        .map((arg) => {
                            if (typeof arg === "object") {
                                return JSON.stringify(arg, null, 2);
                            }
                            return String(arg);
                        })
                        .join(" ");
                    consoleLogs.push(logMessage);
                };

                try {
                    const result = eval(input);
 
                    console.log = originalConsoleLog;
 
                    if (consoleLogs.length > 0) {
                        consoleLogs.forEach((logMessage) => {
                            setOutput((prev) => [
                                ...prev,
                                {
                                    type: "output",
                                    content: `<span style="color: #87ceeb;">${logMessage}</span>`
                                }
                            ]);
                        });
                    }
 
                    if (result !== undefined) {
                        let outputContent = "";
                        let color = "#ffffff";

                        if (typeof result === "boolean" || typeof result === "number") {
                            outputContent = String(result);
                            color = "#ffa500"; // orange
                        } else if (typeof result === "string") {
                            outputContent = `"${result}"`;
                            color = "#00ff00"; // green
                        } else if (typeof result === "object") {
                            outputContent = JSON.stringify(result, null, 2);
                            color = "#00bfff"; // blue
                        } else {
                            outputContent = String(result);
                        }

                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "output",
                                content: `<span style="color: ${color};">${outputContent}</span>`
                            }
                        ]);
                    }
                } catch (error) { 
                    console.log = originalConsoleLog;

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "error",
                            content: `Error: ${error}`
                        }
                    ]);
                }
                return;
            }

            // Espandi gli alias prima di processare il comando
            let expandedInput = input;
            const firstWord = input.trim().split(" ")[0];
            if (aliases[firstWord]) {
                const restOfCommand = input.trim().split(" ").slice(1).join(" ");
                expandedInput = aliases[firstWord] + (restOfCommand ? " " + restOfCommand : "");
            }

            const hasRedirect = expandedInput.includes(">>") || expandedInput.includes(">");
            let commandPart = expandedInput;
            let redirectType = null;
            let targetFile = null;

            if (hasRedirect) {
                if (expandedInput.includes(">>")) {
                    const parts = expandedInput.split(">>");
                    commandPart = parts[0].trim();
                    targetFile = parts[1].trim();
                    redirectType = "append";
                } else if (expandedInput.includes(">")) {
                    const parts = expandedInput.split(">");
                    commandPart = parts[0].trim();
                    targetFile = parts[1].trim();
                    redirectType = "write";
                }
            }
 
            setCommandHistory((prev) => {
                const newHistory = [...prev, input];
                return newHistory.slice(-100); // only 100 last commands
            });

            const commandName = commandPart.split(" ")[0];
            const command = commands.find((cmd) => cmd.name === commandName);

            if (command) { 
                //update stats
                setStats((prev) => ({
                    ...prev,
                    commands: {
                        ...prev.commands,
                        [commandName]: (prev.commands[commandName] || 0) + 1
                    }
                }));
 
                if (commandName !== "screenshot") {
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: getPromptText() + " " + input
                        }
                    ]);
                }
 
                const result = command.execute(commandPart, settings.currentUser);

                if (result && hasRedirect && targetFile) {
                    const normalizedPath = normalizePath(targetFile);
                    const outputContent = result.textContent || result.innerHTML.replace(/<[^>]*>/g, "");

                    try {
                        if (redirectType === "append") {
                            const existingContent = fileSystemFunctions.readFileContent(normalizedPath) || "";
                            fileSystemFunctions.changeFileContent(
                                normalizedPath,
                                existingContent + outputContent + "\n"
                            );
                        } else {
                            if (!fileSystemFunctions.exists(normalizedPath)) {
                                fileSystemFunctions.createFile(normalizedPath, outputContent + "\n");
                            } else {
                                fileSystemFunctions.changeFileContent(normalizedPath, outputContent + "\n");
                            }
                        }
                        setFileSystem({ ...fileSystem });
                    } catch (error) {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: `bash: ${targetFile}: ${(error as any).message}`
                            }
                        ]);
                    }
                } else if (result) {
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "output",
                            content: result.innerHTML || result.textContent
                        }
                    ]);
                } else if (commandName !== "screenshot") {
                    if (commandName !== "clear") {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "command",
                                content: getPromptText() + " " + input
                            }
                        ]);
                    }
                }
            } else { 
                //math
                const mathPattern = /^[\d+\-*/().\s]+$/;
                if (mathPattern.test(commandName) || mathPattern.test(expandedInput.trim())) {
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: getPromptText() + " " + input
                        }
                    ]);

                    try { 
                        const sanitizedInput = expandedInput.trim().replace(/[^0-9+\-*/().\s]/g, "");
                        if (sanitizedInput) {
                            const result = Function(`"use strict"; return (${sanitizedInput})`)();
                            setOutput((prev) => [
                                ...prev,
                                {
                                    type: "output",
                                    content: result.toString()
                                }
                            ]);
                        } else {
                            throw new Error("Invalid expression");
                        }
                    } catch (error) {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: `Math error: Invalid expression`
                            }
                        ]);
                    }
                } else { 
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: getPromptText() + " " + input
                        },
                        {
                            type: "error",
                            content: `${commandName}: command not found`
                        }
                    ]);
                }
            }

            setHistoryPosition(-1);
        },
        [settings.currentUser, currentPath, commands, stats, fileSystem, fileSystemFunctions]
    );

    const getPromptText = () => { 
        if (mode === "javascript") {
            return "<span style='color: #ffff00'>></span>";
        }
 
        if (resetWarningMode.active) {
            if (resetWarningMode.step === 1) {
                return "<span style='color: #ff6b6b'>Reset Warning</span> <span style='color: #74c0fc'>[y/N]</span>";
            } else {
                return "<span style='color: #ff4757'>Final Confirmation</span> <span style='color: #74c0fc'>[y/N]</span>";
            }
        }
 
        if (passwordMode.active) {
            return passwordMode.prompt;
        }

        const user = settings.users.find((u) => u.UID === settings.currentUser);
        const userName = user ? user.name : "unknown";
        const isRoot = settings.currentUser === 0;
        const promptChar = isRoot ? "#" : "$";

        return `<span style="color: ${isRoot ? "#a82403" : "#34a853"}">${userName}@${browserName}</span>:<span style="color: #3f65bd">${currentPath}</span>${promptChar}`;
    };

    const handleTabCompletion = () => {
        const completions = getAutocompleteSuggestions(command);

        if (completions.length === 0) {
            setShowSuggestions(false);
            return;
        }

        if (completions.length === 1) {
            const newCommand = applyCompletion(command, completions[0]);
            setCommand(newCommand);
            setShowSuggestions(false);
        } else if (showSuggestions && suggestions.length > 0) {
            const selectedCompletion = suggestions[selectedSuggestionIndex];
            const newCommand = applyCompletion(command, selectedCompletion);
            setCommand(newCommand);
            setShowSuggestions(false);
        } else {
            const commonPrefix = findCommonPrefix(completions);
            const parts = command.trim().split(" ");
            const currentArg = parts[parts.length - 1];

            if (commonPrefix.length > currentArg.length) {
                const newCompletion = { value: commonPrefix, type: "partial" };
                const newCommand = applyCompletion(command, newCompletion);
                setCommand(newCommand);
            }

            setSuggestions(completions);
            setSelectedSuggestionIndex(0);
            setShowSuggestions(true);
            setSuggestionPosition(calculateSuggestionPosition());
        }
    };

    const handleArrowNavigation = (direction: string) => {
        if (!showSuggestions || suggestions.length === 0) return;

        let newIndex;
        if (direction === "up") {
            newIndex = selectedSuggestionIndex > 0 ? selectedSuggestionIndex - 1 : suggestions.length - 1;
        } else {
            newIndex = selectedSuggestionIndex < suggestions.length - 1 ? selectedSuggestionIndex + 1 : 0;
        }

        setSelectedSuggestionIndex(newIndex);

        if (suggestionsRef.current) {
            const container = suggestionsRef.current;
            const selectedElement = container.children[newIndex];

            if (selectedElement) {
                const containerRect = container.getBoundingClientRect();
                const elementRect = selectedElement.getBoundingClientRect();

                if (elementRect.top < containerRect.top) {
                    selectedElement.scrollIntoView({ block: "start", behavior: "smooth" });
                } else if (elementRect.bottom > containerRect.bottom) {
                    selectedElement.scrollIntoView({ block: "end", behavior: "smooth" });
                }
            }
        }
    };

    const handleHistoryNavigation = (direction: string) => {
        if (commandHistory.length === 0) return;

        let newPosition;
        if (direction === "up") {
            if (historyPosition === -1) {
                newPosition = commandHistory.length - 1;
            } else if (historyPosition > 0) {
                newPosition = historyPosition - 1;
            } else {
                return; 
            }
        } else {
            // down
            if (historyPosition === -1) {
                return; 
            } else if (historyPosition < commandHistory.length - 1) {
                newPosition = historyPosition + 1;
            } else {
                newPosition = -1; 
                setCommand("");
                setHistoryPosition(newPosition);
                return;
            }
        }

        setHistoryPosition(newPosition);
        setCommand(commandHistory[newPosition]);
    };
 
    const handlePasswordSubmit = (password: string) => {
        const maxAttempts = 3;

        switch (passwordMode.type) {
            case "su":
                const targetUser = passwordMode.data.targetUser;
                if (password === targetUser.password) {
                    // corretta 
                    setSettings((prev) => ({
                        ...prev,
                        lastUser: prev.currentUser,
                        currentUser: targetUser.UID
                    }));
                    setCurrentUser(targetUser.name);
                    setCurrentPath(targetUser.home);

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        },
                        {
                            type: "success",
                            content: `Switched to user: ${targetUser.name}`
                        }
                    ]);
 
                    setPasswordMode({
                        active: false,
                        type: "",
                        data: null,
                        prompt: "",
                        attempts: 0
                    });
                } else {
                    // wrong
                    const newAttempts = passwordMode.attempts + 1;

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        },
                        {
                            type: "error",
                            content: "su: Authentication failure"
                        }
                    ]);

                    if (newAttempts >= maxAttempts) { 
                        setPasswordMode({
                            active: false,
                            type: "",
                            data: null,
                            prompt: "",
                            attempts: 0
                        });
                    } else { 
                        setPasswordMode({
                            ...passwordMode,
                            attempts: newAttempts
                        });
                    }
                }
                break;

            case "sudo":
                const currentUserData = settings.users.find((u) => u.UID === settings.currentUser);
                if (password === currentUserData?.password) { 
                    grantSudoAccess(settings.currentUser);

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        }
                    ]);
 
                    const tempCurrentUser = settings.currentUser;
                    setSettings((prev) => ({ ...prev, currentUser: 0 }));  
                    const commandName = passwordMode.data.command.split(" ")[0];
                    const command = commands.find((cmd) => cmd.name === commandName);

                    if (command) {
                        const result = command.execute(passwordMode.data.command, 0);  
                        if (result) {
                            setOutput((prev) => [
                                ...prev,
                                {
                                    type: "output",
                                    content: result.innerHTML || result.textContent
                                }
                            ]);
                        }
                    } else {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: `${commandName}: command not found`
                            }
                        ]);
                    }

                    setSettings((prev) => ({ ...prev, currentUser: tempCurrentUser }));  
 
                    setPasswordMode({
                        active: false,
                        type: "",
                        data: null,
                        prompt: "",
                        attempts: 0
                    });
                } else { 
                    const newAttempts = passwordMode.attempts + 1;

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        },
                        {
                            type: "error",
                            content: "sudo: incorrect password"
                        }
                    ]);

                    if (newAttempts >= maxAttempts) {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error",
                                content: "sudo: 3 incorrect password attempts"
                            }
                        ]);

                        setPasswordMode({
                            active: false,
                            type: "",
                            data: null,
                            prompt: "",
                            attempts: 0
                        });
                    } else {
                        setPasswordMode({
                            ...passwordMode,
                            attempts: newAttempts
                        });
                    }
                }
                break;

            case "passwd_current":
                const userToCheck = passwordMode.data.targetUser;
                if (password === userToCheck.password) {
                    //correct
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        }
                    ]);

                    setPasswordMode({
                        active: true,
                        type: "passwd_new",
                        data: passwordMode.data,
                        prompt: "New password: ",
                        attempts: 0
                    });
                } else {
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "command",
                            content: passwordMode.prompt
                        },
                        {
                            type: "error",
                            content: "passwd: Authentication failure"
                        }
                    ]);

                    setPasswordMode({
                        active: false,
                        type: "",
                        data: null,
                        prompt: "",
                        attempts: 0
                    });
                }
                break;

            case "passwd_new":
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: passwordMode.prompt
                    }
                ]);

                setPasswordMode({
                    active: true,
                    type: "passwd_confirm",
                    data: { ...passwordMode.data, newPassword: password },
                    prompt: "Retype new password: ",
                    attempts: 0
                });
                break;

            case "passwd_confirm": 
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: passwordMode.prompt
                    }
                ]);

                if (password === passwordMode.data.newPassword) { 
                    const updatedUsers = settings.users.map((user) =>
                        user.UID === passwordMode.data.targetUser.UID ? { ...user, password: password } : user
                    );

                    setSettings((prev) => ({ ...prev, users: updatedUsers }));

                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "success",
                            content: "passwd: password updated successfully"
                        }
                    ]);
                } else {
                    setOutput((prev) => [
                        ...prev,
                        {
                            type: "error",
                            content: "passwd: passwords do not match"
                        }
                    ]);
                }

                setPasswordMode({
                    active: false,
                    type: "",
                    data: null,
                    prompt: "",
                    attempts: 0
                });
                break;

            default:
                setPasswordMode({
                    active: false,
                    type: "",
                    data: null,
                    prompt: "",
                    attempts: 0
                });
                break;
        }
    };
 
    const handleNanoSave = () => {
        const normalizedPath = normalizePath(nanoMode.fileName);

        try {
            if (nanoMode.isNewFile && !fileSystemFunctions.exists(normalizedPath)) {
                fileSystemFunctions.createFile(normalizedPath, nanoMode.content);
                setFileSystem({ ...fileSystem });
            } else {
                fileSystemFunctions.changeFileContent(normalizedPath, nanoMode.content);
                setFileSystem({ ...fileSystem });
            }

            setNanoMode((prev) => ({
                ...prev,
                hasUnsavedChanges: false,
                isNewFile: false,
                statusMessage: `[ Wrote ${nanoMode.content.split("\n").length} lines ]`
            }));

            
            setTimeout(() => {
                setNanoMode((prev) => ({
                    ...prev,
                    statusMessage: ""
                }));
            }, 2000);
        } catch (error) {
            setNanoMode((prev) => ({
                ...prev,
                statusMessage: `[ Error: Cannot write to ${nanoMode.fileName}: ${(error as Error).message} ]`
            }));
        }
    };

    const handleNanoExit = () => {
        if (nanoMode.hasUnsavedChanges) {
            // Mostra il prompt di conferma di uscita
            setNanoMode((prev) => ({
                ...prev,
                showExitPrompt: true
            }));
        } else { 
            setNanoMode({
                active: false,
                fileName: "",
                isNewFile: false,
                content: "",
                cursorPosition: 0,
                hasUnsavedChanges: false,
                statusMessage: "",
                showExitPrompt: false
            });
            setIsNanoOpen(false);
 
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    };

    const handleNanoExitPromptResponse = (response: "yes" | "no" | "cancel") => {
        if (response === "yes") {
            // Salva e esci
            handleNanoSave();
            setNanoMode({
                active: false,
                fileName: "",
                isNewFile: false,
                content: "",
                cursorPosition: 0,
                hasUnsavedChanges: false,
                statusMessage: "",
                showExitPrompt: false
            });
            setIsNanoOpen(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        } else if (response === "no") {
            // Esci senza salvare
            setNanoMode({
                active: false,
                fileName: "",
                isNewFile: false,
                content: "",
                cursorPosition: 0,
                hasUnsavedChanges: false,
                statusMessage: "",
                showExitPrompt: false
            });
            setIsNanoOpen(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        } else {
            // Cancel: torna all'editor
            setNanoMode((prev) => ({
                ...prev,
                showExitPrompt: false
            }));
        }
    };

    const handleNanoKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Se è attivo il prompt di uscita, gestisci solo Y/N/Ctrl+C
        if (nanoMode.showExitPrompt) {
            if (e.key.toLowerCase() === "y") {
                e.preventDefault();
                handleNanoExitPromptResponse("yes");
            } else if (e.key.toLowerCase() === "n") {
                e.preventDefault();
                handleNanoExitPromptResponse("no");
            } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
                e.preventDefault();
                handleNanoExitPromptResponse("cancel");
            }
            return;
        }

        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case "x": // Exit
                    e.preventDefault();
                    handleNanoExit();
                    break;

                case "o": // Write Out (Save)
                    e.preventDefault();
                    handleNanoSave();
                    break;

            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { 
        if (resetWarningMode.active) {
            if (e.key === "Enter") {
                const response = command.toLowerCase().trim();

                if (resetWarningMode.step === 1) {
                    if (response === "y" || response === "yes") { 
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "command",
                                content: getPromptText() + " " + command
                            },
                            {
                                type: "output",
                                content: ""
                            },
                            {
                                type: "error",
                                content: "🚨 <span style='color: #ff4757'>FINAL CONFIRMATION</span> 🚨"
                            },
                            {
                                type: "output",
                                content: ""
                            },
                            {
                                type: "error",
                                content: "<span style='color: #ff6b6b; font-weight: bold'>LAST WARNING!</span>"
                            },
                            {
                                type: "output",
                                content: "<span style='color: #fff'>This action cannot be undone.</span>"
                            },
                            {
                                type: "output",
                                content: ""
                            },
                            {
                                type: "output",
                                content:
                                    "<span style='color: #ffd93d'>Press Y to confirm terminal reset</span> <span style='color: #74c0fc'>[y/N]</span>"
                            }
                        ]);

                        setResetWarningMode({
                            active: true,
                            step: 2
                        });
                        setCommand("");
                        return;
                    } else {
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "command",
                                content: getPromptText() + " " + command
                            },
                            {
                                type: "success",
                                content: "Reset cancelled."
                            }
                        ]);

                        setResetWarningMode({
                            active: false,
                            step: 1
                        });
                        setCommand("");
                        return;
                    }
                } else if (resetWarningMode.step === 2) {
                    if (response === "y" || response === "yes") { 
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "command",
                                content: getPromptText() + " " + command
                            },
                            {
                                type: "output",
                                content: "<span style='color: #ff6b6b'>Resetting terminal...</span>"
                            }
                        ]);

                        setTimeout(() => {
                            setOutput([]);
                            setOutputAfterInput("");
                            setCurrentPath("/");
                            setCommand("");
                            localStorage.removeItem("terminalState");
                            localStorage.removeItem("terminalFileSystem");
                            localStorage.removeItem("terminalSettings");
                            localStorage.removeItem("terminalStats");
                            localStorage.setItem("reopenTerminal", "true");
                            window.location.reload();
                        }, 500);
                        return;
                    } else {
                        // Seconda conferma rifiutata
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "command",
                                content: getPromptText() + " " + command
                            },
                            {
                                type: "success",
                                content: "Reset cancelled."
                            }
                        ]);

                        setResetWarningMode({
                            active: false,
                            step: 1
                        });
                        setCommand("");
                        return;
                    }
                }
            } else if (e.ctrlKey && e.key === "c") {
                e.preventDefault();
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: getPromptText() + " " + command + " ^C"
                    },
                    {
                        type: "success",
                        content: "Reset cancelled."
                    }
                ]);

                setResetWarningMode({
                    active: false,
                    step: 1
                });
                setCommand("");
            }
            return; 
        }

        if (passwordMode.active) {
            if (e.key === "Enter") {
                handlePasswordSubmit(command);
                setCommand("");
            } else if (e.ctrlKey && e.key === "c") {
                e.preventDefault();
                setPasswordMode({
                    active: false,
                    type: "",
                    data: null,
                    prompt: "",
                    attempts: 0
                });
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: passwordMode.prompt + " ^C"
                    },
                    {
                        type: "error",
                        content: "Authentication cancelled"
                    }
                ]);
                setCommand("");
            }
            return; 
        }

        //  normale
        if (e.key === "Enter") {
            if (!passwordMode.active && showSuggestions && suggestions.length > 0) {
                const selectedCompletion = suggestions[selectedSuggestionIndex];
                const newCommand = applyCompletion(command, selectedCompletion);
                setCommand(newCommand);
                setShowSuggestions(false);
            } else {
                handleCommand(command);
                setCommand("");
            }
        } else if (e.key === "ArrowUp") {
            if (!passwordMode.active && showSuggestions) {
                e.preventDefault();
                handleArrowNavigation("up");
            } else {
                e.preventDefault();
                handleHistoryNavigation("up");
            }
        } else if (e.key === "ArrowDown") {
            if (!passwordMode.active && showSuggestions) {
                e.preventDefault();
                handleArrowNavigation("down");
            } else {
                e.preventDefault();
                handleHistoryNavigation("down");
            }
        } else if (e.key === "Escape") {
            if (!passwordMode.active) {
                setShowSuggestions(false);
            }
        } else if (e.key === "Tab") {
            if (!passwordMode.active) {
                e.preventDefault();
                handleTabCompletion();
            }
        } else if (e.ctrlKey && e.key === "c") {
            e.preventDefault();
            setShowSuggestions(false);

            if (mode === "javascript") {
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: getPromptText() + " " + command + " ^C"
                    },
                    {
                        type: "success",
                        content: "Exited JavaScript mode"
                    }
                ]);
                setMode("normal");
            } else {
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "command",
                        content: getPromptText() + " " + command + " ^C"
                    }
                ]);
            }
            setCommand("");
        } else {
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }, [output]);

    useEffect(() => {
        if (isNanoOpen && nanoMode.active) {
            if (nanoMode.showExitPrompt && nanoPromptRef.current) {
                setTimeout(() => {
                    nanoPromptRef.current?.focus();
                }, 0);
            } else if (!nanoMode.showExitPrompt && nanoTextareaRef.current) {
                setTimeout(() => {
                    nanoTextareaRef.current?.focus();
                    nanoTextareaRef.current?.setSelectionRange(nanoMode.cursorPosition, nanoMode.cursorPosition);
                }, 0);
            }
        }
    }, [isNanoOpen, nanoMode.active, nanoMode.showExitPrompt]);

    const handleTerminalClick = () => {
        if (isNanoOpen && nanoMode.active) {
            if (nanoMode.showExitPrompt && nanoPromptRef.current) {
                // Se c'è il prompt: focus
                nanoPromptRef.current.focus();
            } else if (!nanoMode.showExitPrompt && nanoTextareaRef.current) {
                // Altrimenti focus sul textarea di nano
                nanoTextareaRef.current.focus();
            }
        } else if (inputRef.current && !isMinimized && !isNanoOpen) {
            const hasInputSelection = inputRef.current.selectionStart !== inputRef.current.selectionEnd;
            const globalSelection = window.getSelection();
            const hasGlobalSelection = globalSelection ? globalSelection.toString().length > 0 : false;

            if (!hasInputSelection && !hasGlobalSelection) {
                inputRef.current.focus();
            }
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!isMinimized && isNanoOpen && nanoMode.active) {
                if (
                    nanoMode.showExitPrompt &&
                    nanoPromptRef.current &&
                    document.activeElement !== nanoPromptRef.current
                ) {
                    const isPrintable =
                        e.key.length === 1 || ["Backspace", "Delete", "Enter", "Tab", "Space"].includes(e.key);

                    if (isPrintable && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        nanoPromptRef.current.focus();
                    }
                } else if (
                    !nanoMode.showExitPrompt &&
                    nanoTextareaRef.current &&
                    document.activeElement !== nanoTextareaRef.current
                ) {
                    const isPrintable =
                        e.key.length === 1 || ["Backspace", "Delete", "Enter", "Tab", "Space"].includes(e.key);

                    if (isPrintable && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        nanoTextareaRef.current.focus();
                    }
                }
            } else if (!isMinimized && !isNanoOpen && inputRef.current && document.activeElement !== inputRef.current) {
                const isPrintable =
                    e.key.length === 1 || ["Backspace", "Delete", "Enter", "Tab", "Space"].includes(e.key);

                if (isPrintable && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const isSimpleCharacter = e.key.length === 1;

                    if (isSimpleCharacter) {
                        inputRef.current.focus();
                    } else {
                        const hasInputSelection = inputRef.current.selectionStart !== inputRef.current.selectionEnd;
                        const globalSelection = window.getSelection();
                        const hasGlobalSelection = globalSelection ? globalSelection.toString().length > 0 : false;

                        if (!hasInputSelection && !hasGlobalSelection) {
                            inputRef.current.focus();
                        }
                    }
                }
            }
        };

        document.addEventListener("keydown", handleGlobalKeyDown);
        return () => {
            document.removeEventListener("keydown", handleGlobalKeyDown);
        };
    }, [isMinimized, isNanoOpen, nanoMode.active, nanoMode.showExitPrompt]);

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    const handleMaximize = () => {
        if (!isMaximized) {
            // Prima di massimizzare, salva la posizione corrente
            setPreviousState(currentDimensions);
        }
        setIsMaximized(!isMaximized);
    };

    const handleScreenshot = () => {
        const terminalElement = terminalBodyRef.current;
        if (!terminalElement) return;

        import("html2canvas")
            .then(({ default: html2canvas }) => {
                // Nascondi temporaneamente tutto tranne gli output
                const inputLine = (terminalElement as HTMLElement).querySelector(
                    ".flex.items-center:last-child"
                ) as HTMLElement;
                const outputElements = (terminalElement as HTMLElement).querySelectorAll(".mb-1");
                const lastOutput = outputElements[outputElements.length - 1] as HTMLElement;

                // Salva le visualizzazioni originali
                const originalInputDisplay = inputLine ? inputLine.style.display : "";
                const originalLastOutputDisplay = lastOutput ? lastOutput.style.display : "";

                // Nascondi input line
                if (inputLine) inputLine.style.display = "none";

                html2canvas(terminalElement as HTMLElement, {
                    backgroundColor: "#000000",
                    allowTaint: true,
                    useCORS: true,
                    scale: 2,
                    width: (terminalElement as HTMLElement).offsetWidth,
                    height: (terminalElement as HTMLElement).offsetHeight
                })
                    .then((canvas: HTMLCanvasElement) => {
                        // Ripristina la visualizzazione
                        if (inputLine) inputLine.style.display = originalInputDisplay;
                        if (lastOutput) lastOutput.style.display = originalLastOutputDisplay;

                        // Crea il link per il download
                        const image = canvas.toDataURL("image/png");
                        const link = document.createElement("a");
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
                        link.href = image;
                        link.download = `terminal-screenshot-${timestamp}.png`;

                        // download trigger
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Aggiorna le statistiche
                        const today = new Date().toLocaleDateString();
                        setStats((prev: any) => ({
                            ...prev,
                            screenshots: {
                                ...prev.screenshots,
                                [today]: (prev.screenshots[today] || 0) + 1
                            }
                        }));

                        // Mostra messaggio di conferma nel terminale
                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "output" as const,
                                content: `Screenshot saved: terminal-screenshot-${timestamp}.png`
                            }
                        ]);
                    })
                    .catch((error: any) => {
                        console.error("Screenshot error:", error);

                        // Ripristina in caso di errore
                        if (inputLine) inputLine.style.display = originalInputDisplay;
                        if (lastOutput) lastOutput.style.display = originalLastOutputDisplay;

                        setOutput((prev) => [
                            ...prev,
                            {
                                type: "error" as const,
                                content: `Screenshot failed: ${error.message}`
                            }
                        ]);
                    });
            })
            .catch((error: any) => {
                console.error("Error loading html2canvas:", error);
                setOutput((prev) => [
                    ...prev,
                    {
                        type: "error" as const,
                        content: "Screenshot library not available"
                    }
                ]);
            });
    };

    const handleReset = () => {
        setResetWarningMode({
            active: true,
            step: 1
        });

        setOutput((prev) => [
            ...prev,
            {
                type: "command",
                content: getPromptText() + " reset"
            },
            {
                type: "error",
                content: "⚠️  <span style='color: #ff6b6b'>TERMINAL RESET WARNING</span> ⚠️"
            },
            {
                type: "output",
                content: ""
            },
            {
                type: "output",
                content: "<span style='color: #ffd93d'>This will permanently delete ALL terminal data:</span>"
            },
            {
                type: "output",
                content: "  • <span style='color: #ccc'>Command history</span>"
            },
            {
                type: "output",
                content: "  • <span style='color: #ccc'>File system state</span>"
            },
            {
                type: "output",
                content: "  • <span style='color: #ccc'>Settings and configurations</span>"
            },
            {
                type: "output",
                content: "  • <span style='color: #ccc'>All unsaved work</span>"
            },
            {
                type: "output",
                content: ""
            },
            {
                type: "output",
                content:
                    "<span style='color: #ff9999'>Are you absolutely sure?</span> <span style='color: #74c0fc'>[y/N]</span>"
            }
        ]);

        setCommand("");
    };

    const getCurrentDimensions = () => {
        if (isMaximized) {
            return {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
        return previousState;
    };

    const handleResizeStop = (e: any, direction: any, ref: any, delta: any, position: any) => {
        if (!isMaximized) {
            setPreviousState({
                x: position.x,
                y: position.y,
                width: ref.offsetWidth,
                height: ref.offsetHeight
            });
        }
    };

    const handleDragStop = (e: any, d: any) => {
        if (!isMaximized) {
            setPreviousState((prev) => ({
                ...prev,
                x: d.x,
                y: d.y
            }));
        }
    };

    const currentDimensions = getCurrentDimensions();

    const selectSuggestion = (suggestion: Suggestion, index: number) => {
        const newCommand = applyCompletion(command, suggestion);
        setCommand(newCommand);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    // MARK: - Render Component

    return (
        <>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50">
                <Rnd
                    position={{ x: currentDimensions.x, y: currentDimensions.y }}
                    size={{
                        width: currentDimensions.width,
                        height: isMinimized ? 40 : currentDimensions.height
                    }}
                    minWidth={400}
                    minHeight={40}
                    maxHeight={isMinimized ? 40 : undefined}
                    dragHandleClassName="drag-handle"
                    className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
                    enableResizing={!isMinimized && !isMaximized}
                    disableDragging={isMaximized}
                    onResizeStop={handleResizeStop}
                    onDragStop={handleDragStop}
                    style={{
                        borderRadius: isMaximized ? "0" : "0.5rem"
                    }}>
                    {/* Top Bar */}
                    <div
                        className="drag-handle bg-gray-700 h-10 flex items-center justify-between px-3 cursor-move select-none"
                        style={{ cursor: isMaximized ? "default" : "move" }}>
                        {/* Buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleClose}
                                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                title="Close"
                            />
                            <button
                                onClick={handleMinimize}
                                className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors"
                                title="Minimize"
                            />
                            <button
                                onClick={handleMaximize}
                                className={`w-3 h-3 rounded-full hover:bg-green-600 transition-colors ${
                                    isMaximized ? "bg-green-600" : "bg-green-500"
                                }`}
                                title={isMaximized ? "Restore" : "Maximize"}
                            />
                        </div>

                        {/* Title */}
                        <div className="text-gray-300 text-sm font-medium">
                            {settings.users.find((u) => u.UID === settings.currentUser)?.name || "user"}@{browserName}
                            {isMaximized && " (Maximized)"}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleScreenshot}
                                className="p-1.5 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
                                title="Screenshot">
                                <Camera size={14} className="text-white" />
                            </button>
                            <button
                                onClick={handleReset}
                                className="p-1.5 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
                                title="Reset">
                                <Trash2 size={14} className="text-red-400" />
                            </button>
                        </div>
                    </div>

                    {/* Terminal Body */}
                    {!isMinimized && (
                        <div
                            ref={terminalBodyRef}
                            onClick={handleTerminalClick}
                            className="bg-black font-mono text-sm p-4 h-full overflow-y-auto relative cursor-text"
                            style={{
                                height: `calc(100% - 2.5rem)`,
                                color: "#ffffff", // Forza il testo bianco
                                backgroundColor: "#000000" // Forza lo sfondo nero
                            }}>
                            {/* Nano Editor */}
                            {isNanoOpen && nanoMode.active ? (
                                <div className="h-full flex flex-col">
                                    {/* Header nano */}
                                    <div className="bg-gray-700 text-white px-2 py-1 text-center text-xs border-b border-gray-600">
                                        nano {nanoMode.fileName}{" "}
                                        {nanoMode.isNewFile ? "New" : nanoMode.hasUnsavedChanges ? "*" : ""}
                                    </div>

                                    {/* Exit Prompt */}
                                    {nanoMode.showExitPrompt ? (
                                        <div
                                            ref={nanoPromptRef}
                                            className="flex-1 bg-black text-white p-4 flex flex-col justify-center items-center outline-none"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key.toLowerCase() === "y") {
                                                    e.preventDefault();
                                                    handleNanoExitPromptResponse("yes");
                                                } else if (e.key.toLowerCase() === "n") {
                                                    e.preventDefault();
                                                    handleNanoExitPromptResponse("no");
                                                } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
                                                    e.preventDefault();
                                                    handleNanoExitPromptResponse("cancel");
                                                }
                                            }}>
                                            {/* Nano no saved prompt */}
                                            <div className="text-center space-y-4">
                                                <div className="text-lg">Save modified buffer?</div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-4">
                                                        <span className="bg-gray-800 px-2 py-1 rounded text-sm">Y</span>
                                                        <span>Yes</span>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <span className="bg-gray-800 px-2 py-1 rounded text-sm">N</span>
                                                        <span>No</span>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <span className="bg-gray-800 px-2 py-1 rounded text-sm">
                                                            ^C
                                                        </span>
                                                        <span>Cancel</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Area di testo */}
                                            <textarea
                                                ref={nanoTextareaRef}
                                                value={nanoMode.content}
                                                onChange={(e) => {
                                                    setNanoMode((prev) => ({
                                                        ...prev,
                                                        content: e.target.value,
                                                        hasUnsavedChanges: true,
                                                        cursorPosition: e.target.selectionStart
                                                    }));
                                                }}
                                                onSelect={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    setNanoMode((prev) => ({
                                                        ...prev,
                                                        cursorPosition: target.selectionStart
                                                    }));
                                                }}
                                                onKeyDown={handleNanoKeyDown}
                                                className="flex-1 bg-black text-white border-none outline-none p-2 font-mono text-sm resize-none"
                                                style={{
                                                    tabSize: 4,
                                                    lineHeight: "1.2"
                                                }}
                                                spellCheck="false"
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                            />

                                            {/* Status bar */}
                                            <div className="bg-gray-800 text-gray-300 px-2 py-1 text-xs border-t border-gray-600">
                                                {(() => {
                                                    const lines = nanoMode.content.split("\n");
                                                    const textBeforeCursor = nanoMode.content.substring(
                                                        0,
                                                        nanoMode.cursorPosition
                                                    );
                                                    const currentLine = textBeforeCursor.split("\n").length;
                                                    const currentCol = textBeforeCursor.split("\n").pop()?.length || 0;
                                                    return `[ line ${currentLine}/${lines.length}, col ${currentCol}/${lines[currentLine - 1]?.length || 0} ]`;
                                                })()}
                                                {nanoMode.statusMessage && (
                                                    <span
                                                        className={`ml-4 ${nanoMode.statusMessage.includes("Error") ? "text-red-400" : "text-green-400"}`}>
                                                        {nanoMode.statusMessage}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Footer con comandi */}
                                            <div className="bg-gray-700 text-white p-2 text-xs border-t border-gray-600">
                                                <div>^O Write Out</div>
                                                <div>^X Exit</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Output normale del terminale */}
                                    <div
                                        className=""
                                        style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: "1.2",
                                            color: "#ffffff"
                                        }}>
                                        {output.map((item, index) => (
                                            <div
                                                key={index}
                                                className={`mb-1 ${item.type === "error" ? "text-red-400" : ""}`}>
                                                <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Line */}
                                    <div className="flex items-center">
                                        <span className="mr-2" dangerouslySetInnerHTML={{ __html: getPromptText() }} />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={command}
                                            onChange={(e) => {
                                                setCommand(e.target.value);
                                                if (!passwordMode.active) {
                                                    setShowSuggestions(false);
                                                }
                                            }}
                                            onKeyDown={handleKeyDown}
                                            className="bg-transparent border-none outline-none flex-1 font-mono"
                                            style={{
                                                color: passwordMode.active ? "transparent" : "#ffffff",
                                                backgroundColor: "transparent",
                                                caretColor: passwordMode.active ? "transparent" : "#ffffff",
                                                textShadow: passwordMode.active ? "0 0 0 transparent" : "none",
                                                ...(passwordMode.active && {
                                                    WebkitTextFillColor: "transparent",
                                                    textSecurity: "none",
                                                    WebkitTextSecurity: "none"
                                                })
                                            }}
                                            placeholder=""
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                        />
                                    </div>

                                    {/* Output after input */}
                                    {outputAfterInput && (
                                        <div className="mt-4">
                                            <div dangerouslySetInnerHTML={{ __html: outputAfterInput }} />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </Rnd>
            </div>

            {/* Suggestions Overlay */}
            {!passwordMode.active && showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="fixed bg-gray-800 border border-gray-600 rounded shadow-2xl z-[100] max-w-md"
                    style={{
                        left: Math.min(currentDimensions.x + suggestionPosition.x, window.innerWidth - 250),
                        top: Math.min(currentDimensions.y + 40 + suggestionPosition.y, window.innerHeight - 200),
                        minWidth: "200px",
                        maxHeight: "200px",
                        overflowY: "auto"
                    }}>
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between transition-colors ${
                                index === selectedSuggestionIndex
                                    ? "bg-blue-600 text-white"
                                    : "hover:bg-gray-700 text-gray-300"
                            }`}
                            onClick={() => selectSuggestion(suggestion, index)}>
                            <span className="flex items-center">
                                <span className="mr-2 text-xs">
                                    {suggestion.isDirectory
                                        ? "📁"
                                        : suggestion.type === "command"
                                          ? "⚡"
                                          : suggestion.type == "option"
                                            ? "🔧"
                                            : "📄"}
                                </span>
                                <span
                                    className={
                                        suggestion.isDirectory
                                            ? "text-blue-400"
                                            : suggestion.type === "command"
                                              ? "text-green-400"
                                              : "text-white"
                                    }>
                                    {suggestion.display}
                                </span>
                                {suggestion.display !== suggestion.value && suggestion.type == "option" && (
                                    <span className="text-xs text-gray-300 ml-2">{suggestion.value}</span>
                                )}
                            </span>

                            <span className="text-xs text-gray-500 ml-2">{suggestion.type}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default DraggableTerminal;
