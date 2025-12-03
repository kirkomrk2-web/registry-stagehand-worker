// --- Utility Functions ---

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function processResponses(responses) {
    const output = {};

    for (const key in responses) {
        const item = responses[key];

        // Ако text е масив – избираме случайна фраза
        if (Array.isArray(item.text)) {
            output[key] = { ...item, text: pickRandom(item.text) };
        } else {
            output[key] = { ...item };
        }
    }

    return output;
}

// --- Base Responses ---

const baseResponses = {
    greeting: { text: ["Хейй 😊", "Здравей 🙂", "Здрасти 🙃"] },
    greeting_followup: {
        text: ["Как да ти помогна?", "Как мога да ти бъда полезна?", "С какво да съдействам?"],
        options: [{ text: "Създай профил", icon: "User" }],
    },
    startRegistration: { 
        text: "Добре, започваме. Как ти е първото име?",
        input: { placeholder: "Първо име (на кирилица)...", icon: "User", type: "text" }
    },
    patronymicName: { 
        text: "Чудесно. А презимето?",
        input: { placeholder: "Презиме (на кирилица)...", icon: "User", type: "text" }
    },
    lastName: { 
        text: "И фамилията?",
        input: { placeholder: "Фамилия (на кирилица)...", icon: "User", type: "text" }
    },
    birthDate: { 
        text: "Записах ги. Каква е датата ти на раждане?",
        input: { placeholder: "ДД.ММ.ГГГГ", icon: "Calendar", type: "date" }
    },
    invalidDateFormat: { 
        text: "Изглежда има проблем с формата на датата. Моля, въведете ДД.ММ.ГГГГ.",
        input: { placeholder: "ДД.ММ.ГГГГ (напр. 15.06.1990)", icon: "Calendar", type: "date" }
    },
    invalidName: {
        text: "Изглежда името е невалидно. Моля, използвай само кирилица и опитай отново.",
        input: { placeholder: "Име (само кирилица)...", icon: "User", type: "text" }
    },
    invalidEmail: {
        text: "Изглежда имейлът е невалиден. Моля, опитай отново.",
        input: { placeholder: "Имейл адрес...", icon: "Mail", type: "email" }
    },

    email: { 
        text: "Супер. И последно – кой е твоят имейл адрес?",
        input: { placeholder: "Имейл адрес...", icon: "Mail", type: "email" }
    },
    emailValidated: { 
        text: "Благодаря! Ще подготвя всичко необходимо. След малко ще получите линк за активиране на имейла си." 
    },
    dataSent: {
        text: "Ако искаш през това време ще ти кажа как да спечелиш 35€?",
        options: [
            { text: "Покани и спечели 35€", icon: "Gift", type: "link", url: "/referral" },
            { text: "Условия и лимити", icon: "Shield", type: "link", url: "/limits" },
            { text: "Планове и цени", icon: "CreditCard", type: "link", url: "/plans" }
        ],
    },
    finalizing: {},
    profileExists: { 
        text: "Такъв профил вече съществува. Може би искаш да влезеш в него?", 
        options: [
            { text: "Вход", icon: "LogIn" },
            { text: "Контакти", icon: "Mail" }
        ]
    },
    underage: { 
        text: "Съжалявам, но трябва да имаш 18 години, за да ползваш услугата.", 
        options: null 
    },
    referralInfo: {
        text: "За всеки доведен приятел печелиш 35€!",
        options: [
            { text: "Моят реферален линк", icon: "Link" },
            { text: "More About Limits", icon: "ArrowRight" }
        ],
    },
    termsInfo: {
        text: "Лимитите са 5000€ на ден и 15000€ на месец.",
        options: [{ text: "Пълна политика за лимити", icon: "FileText" }],
    },
    optionsLocked: { 
        text: "Тази секция се отключва след като завършиш профила си. 🔒",
        options: null 
    },
    fallback: { 
        text: "Хм, не те разбрах. Може ли пак?",
        options: null 
    },
};

// --- Agent Config ---

export const AGENT_CONFIG = {
    "Моника": {
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/06696e280a22c07bcede83d1517792de.jpg",
        responses: processResponses(baseResponses),
    },
    "Мария": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/1a68e650efa5747c35b6f70aea136c33.jpg", 
        responses: processResponses(baseResponses),
    },
    "Петя": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/7b3af9916022fc5236000ce9aa11fff7.jpg",
        responses: processResponses(baseResponses),
    },
    "Кристин": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/116ad509375cb062b66c1e8b83625d2b.jpg",
        responses: processResponses(baseResponses),
    },
    "Рая": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/08712dabf611f47a3cabb6faeb0cc1e6.jpg",
        responses: processResponses(baseResponses),
    },
    "Виктория": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/30cbd452dbaa7cfbbb6b76c26de4ee22.jpg",
        responses: processResponses(baseResponses),
    },
    "Стефани": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/363f52e77346d8982f492c334bfae5a9.jpg",
        responses: processResponses(baseResponses),
    },
    "Йоана": { 
        avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/34b91a80ec6a0673ac1a28a57e3b56a7.jpg",
        responses: processResponses(baseResponses),
    },
};
