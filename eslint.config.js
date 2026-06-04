export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: {
                document: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                MutationObserver: "readonly",
                GM_addStyle: "readonly",
                fetch: "readonly",
                JSON: "readonly",
                console: "readonly",
                window: "readonly",
                history: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "no-redeclare": "error",
            curly: ["error", "all"],
            "no-extra-semi": "warn",
            "no-trailing-spaces": "warn",
            "eol-last": ["warn", "always"],
            indent: ["warn", 4],
            quotes: ["warn", "double", { avoidEscape: true }],
            semi: ["warn", "always"],
            "comma-dangle": ["warn", "always-multiline"],
        },
    },
];
