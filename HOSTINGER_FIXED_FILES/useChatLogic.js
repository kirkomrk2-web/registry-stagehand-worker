import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { AGENT_CONFIG } from '@/lib/agents';
import { useSupabaseWebhook } from '@/hooks/useSupabaseWebhook';
import { useRegistryCheck } from '@/hooks/useRegistryCheck';
import { normalizeDate, validateName, isSpam, validateEmail } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';

export const useChatLogic = ({ isChatOpen, initialFlow, setInitialFlow }) => {
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [validationError, setValidationError] = useState('');
    const [optionsState, setOptionsState] = useState('initial');
    const [showOptionsDelayed, setShowOptionsDelayed] = useState(false);
    const [showFinalization, setShowFinalization] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const { sendToSupabase, isLoading: isSendingToSupabase } = useSupabaseWebhook();
    const { checkRegistry, isLoading: isCheckingRegistry } = useRegistryCheck();
    const { toast } = useToast();
    
    const isProcessing = isTyping || isSendingToSupabase || isCheckingRegistry || isSavingProfile;

    const sessionRef = useRef(session);
    useEffect(() => { sessionRef.current = session; }, [session]);

    const saveSession = useCallback((updatedSession) => {
        try {
            if (updatedSession) {
                localStorage.setItem('chatbotSession', JSON.stringify(updatedSession));
            }
        } catch (e) { console.error("Could not save session:", e); }
    }, []);

    const loadSession = useCallback(() => {
        try {
            const savedSession = localStorage.getItem('chatbotSession');
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                if (AGENT_CONFIG[parsed.agentName]) {
                    setOptionsState(parsed.optionsState || 'initial');
                    return parsed;
                }
            }
        } catch (e) { console.error("Could not load session:", e); }
        
        const agentNames = Object.keys(AGENT_CONFIG);
        const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];
        return { sessionId: crypto.randomUUID(), agentName, step: 'initial', userData: {}, messages: [], optionsState: 'initial' };
    }, []);
    
    const addMessage = useCallback((sender, text, messageOptions = {}) => {
        const newMessage = { id: Date.now() + Math.random(), text, sender, timestamp: new Date(), ...messageOptions };
        
        setMessages(prev => {
            const newMessages = [...prev, newMessage];
            setSession(prevSession => {
                if (!prevSession) return prevSession;
                const updatedSession = { ...prevSession, messages: newMessages };
                saveSession(updatedSession);
                return updatedSession;
            });
            return newMessages;
        });

        if (sender === 'bot') {
            setShowOptionsDelayed(false);
            const delay = messageOptions.quickResponse ? 800 : 2000;
            setTimeout(() => setShowOptionsDelayed(true), delay);
        } else {
            setShowOptionsDelayed(true);
        }
        return newMessage;
    }, [saveSession]);

    const handleConversationFlow = useCallback(async (userInput, currentSession) => {
        if (typeof userInput !== 'string' || !currentSession) return;
        
        const { agentName, step, userData } = currentSession;
        const agent = AGENT_CONFIG[agentName] || Object.values(AGENT_CONFIG)[0];

        const getAgentResponse = (responseType, context = {}) => {
            const responseTemplate = agent.responses[responseType] || agent.responses.fallback;
            let text = Array.isArray(responseTemplate.text) ? responseTemplate.text[Math.floor(Math.random() * responseTemplate.text.length)] : responseTemplate.text;
            if (context.name) text = text.replace('{name}', context.name);
            return { text, options: responseTemplate.options || null, input: responseTemplate.input || null };
        };

        const addBotMessage = (response) => addMessage('bot', response.text, { options: response.options, input: response.input });
        
        const simulateTyping = (callback, delay = null) => {
            if (delay === null) {
                const baseDelay = 1800;
                const randomVariation = Math.random() * 1200;
                delay = baseDelay + randomVariation;
            }
            setIsTyping(true);
            setTimeout(() => { 
                setIsTyping(false); 
                callback(); 
            }, delay);
        };
        
        const updateSession = (updates) => {
            setSession(prev => {
                const newSession = { ...prev, ...updates };
                saveSession(newSession);
                return newSession;
            });
        };

        const processNextStep = (nextStep, context = {}) => {
            const mergedContext = { ...userData, ...context };
            updateSession({ step: nextStep, userData: mergedContext });
            const response = getAgentResponse(nextStep, mergedContext);
            simulateTyping(() => addBotMessage(response));
        };

        const currentStepConfig = getAgentResponse(step) || {};
        const expectedInput = currentStepConfig.input;

        if (userInput === "Моят реферален линк") {
            if (typeof window !== 'undefined') {
                window.open('https://wallesters.com/referral', '_blank');
            }
            return;
        }

        if (userInput === "Вход" && step === 'profileExists') {
            const email = userData.email;
            simulateTyping(() => {
                addBotMessage({
                    text: `За да влезете с ${email}, моля проверете вашия имейл за линк за вход. Ако нямате имейл, свържете се с нашия екип.`,
                    options: [{ text: "Контакти", icon: "Mail" }]
                });
            });
            return;
        }
        
        if (userInput === "Контакти") {
            const agentEmail = `${agent.nameEn}@wallesters.com`;
            const agentTelegram = agent.telegram;
            const agentInstagram = agent.instagram;
            
            const telegramMessage = encodeURIComponent("Здравей, имам нужда от твоята помощ");
            const telegramUrl = `https://t.me/${agentTelegram}?text=${telegramMessage}`;
            const instagramUrl = `https://instagram.com/${agentInstagram}`;
            
            simulateTyping(() => {
                addBotMessage({
                    text: `Винаги можете да се свържете с мен за допълнително съдействие:\n\n📧 Email: ${agentEmail}\n💬 Telegram: @${agentTelegram}\n📷 Instagram: @${agentInstagram}\n⏰ Работно време: Пон-Пет, 9:00-18:00`,
                    options: [
                        { 
                            text: "📤 Пиши в Telegram", 
                            icon: "Send",
                            type: "link",
                            url: telegramUrl 
                        },
                        { 
                            text: "📷 Отвори Instagram", 
                            icon: "Instagram",
                            type: "link",
                            url: instagramUrl 
                        },
                        { 
                            text: "✉️ Изпрати имейл", 
                            icon: "Mail",
                            type: "link",
                            url: `mailto:${agentEmail}` 
                        }
                    ]
                });
            });
            return;
        }

        if (["Създай профил", "Покани и спечели 35€", "Условия и лимити", "More About Limits"].includes(userInput)) {
             if (userInput === "Създай профил" && currentSession.optionsState === 'initial') {
                updateSession({ optionsState: 'profileFlow' });
                processNextStep('startRegistration');
                return;
            }
             if (userInput === "Покани и спечели 35€" && currentSession.optionsState === 'unlocked') {
                updateSession({ optionsState: 'infoFlowReferral' });
                processNextStep('referralInfo');
                return;
            }
             if (userInput === "Условия и лимити" && currentSession.optionsState === 'unlocked') {
                updateSession({ optionsState: 'infoFlowLimits' });
                processNextStep('termsInfo');
                return;
            }
            if (userInput === "More About Limits" && currentSession.optionsState === 'infoFlowReferral') {
                addMessage("user", "Научи повече за лимитите");
                updateSession({ optionsState: 'infoFlowLimits' });
                processNextStep('termsInfo');
                return;
            }
             if (currentSession.optionsState !== 'profileFlow') {
                 simulateTyping(() => addBotMessage(getAgentResponse('optionsLocked')));
             }
            return;
        }

        switch (step) {
            case 'startRegistration':
            case 'patronymicName':
            case 'lastName': {
                const validation = validateName(userInput, false);
                if (isSpam(userInput) || !validation.isValid) {
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidName')));
                    return;
                }
                const nextStepMap = { 'startRegistration': 'patronymicName', 'patronymicName': 'lastName', 'lastName': 'birthDate' };
                const contextKeyMap = { 'startRegistration': 'firstName', 'patronymicName': 'patronymicName', 'lastName': 'lastName' };
                processNextStep(nextStepMap[step], { [contextKeyMap[step]]: validation.name });
                break;
            }
            case 'birthDate': {
                if (expectedInput?.type !== "date") { processNextStep('fallback'); return; }
                const parsedDate = normalizeDate(userInput);
                if (!parsedDate.valid) {
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidDateFormat')));
                    return;
                }
                if (parsedDate.age < 18) {
                    processNextStep('underage');
                    updateSession({ optionsState: 'initial' });
                } else {
                    processNextStep('email', { birthDate: parsedDate.formatted, age: parsedDate.age });
                }
                break;
            }
            case 'email': {
                if (expectedInput?.type !== "email") { processNextStep('fallback'); return; }
                const validation = validateEmail(userInput);
                if (!validation.isValid) {
                    setValidationError(validation.error);
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidEmail')));
                    return;
                }
                
                const finalUserData = { ...userData, email: validation.email };
                setIsSavingProfile(true);
                
                try {
                    let birthDateForDB = finalUserData.birthDate;
                    if (birthDateForDB && birthDateForDB.includes('.')) {
                         birthDateForDB = birthDateForDB.split('.').reverse().join('-');
                    }

                    const { data: existingUser } = await supabase
                        .from('users_pending')
                        .select('id')
                        .eq('email', finalUserData.email)
                        .maybeSingle();

                    if (existingUser) {
                        processNextStep('profileExists');
                        updateSession({ optionsState: 'initial', step: 'profileExists', userData: finalUserData });
                        setIsSavingProfile(false);
                        return;
                    }

                    const { error: insertError } = await supabase
                        .from('users_pending')
                        .insert({
                            first_name: finalUserData.firstName,
                            middle_name: finalUserData.patronymicName,
                            last_name: finalUserData.lastName,
                            birth_date: birthDateForDB,
                            email: finalUserData.email,
                            status: 'pending',
                            full_name: [finalUserData.firstName, finalUserData.patronymicName, finalUserData.lastName].filter(Boolean).join(' ')
                        });

                    if (insertError) throw insertError;

                    const fullName = [finalUserData.firstName, finalUserData.patronymicName, finalUserData.lastName]
                        .filter(Boolean)
                        .join(' ');

                    // 1) Първо съобщение с нормален delay
                    simulateTyping(() => {
                        const response = getAgentResponse('emailValidated');
                        addBotMessage({
                            text: response.text,
                            options: response.options || null,
                            input: response.input || null,
                            quickResponse: true,
                        });
                    });

                    // 2) Бекенд проверки - САМО registry_check (тя вътрешно извиква users_pending_worker)
                    try {
                        console.log('[INFO] Triggering registry_check (which handles everything)...');
                        await checkRegistry({ full_name: fullName, email: finalUserData.email });
                    } catch (workerErr) {
                        console.error('[ERROR] Error in registry check:', workerErr);
                    }
                    
                    // 3) След това – "Ако искаш през това време..."
                    simulateTyping(() => { 
                        updateSession({step: 'dataSent', optionsState: 'unlocked'}); 
                        const response = getAgentResponse('dataSent');
                        addBotMessage(response);
                    });

                } catch (error) {
                    console.error("Process failed:", error);
                    simulateTyping(() => addBotMessage(getAgentResponse('fallback')));
                } finally {
                    setIsSavingProfile(false);
                }
                break;
            }
            default:
                if (currentSession.optionsState === 'profileFlow') {
                    simulateTyping(() => addBotMessage(getAgentResponse('fallback')));
                }
        }
        setValidationError('');
    }, [addMessage, checkRegistry, sendToSupabase, saveSession]);

    const handleSubmit = (text) => {
        if (!text.trim() || isProcessing) return;
        addMessage('user', text);
        handleConversationFlow(text, sessionRef.current);
        setInputValue('');
    };
    
    const handleOptionClick = (option) => {
        if (typeof option !== 'string' || !option.trim()) return;
        addMessage('user', option);
        handleConversationFlow(option, sessionRef.current);
    };

    const handleGreeting = useCallback((agentName) => {
        const getAgentResponse = (responseType) => AGENT_CONFIG[agentName].responses[responseType];

        const greeting = getAgentResponse('greeting');
        const followup = getAgentResponse('greeting_followup');

        const delay1 = 1800 + Math.random() * 1200;
        const delay2 = 1800 + Math.random() * 1200;

        setIsTyping(true);

        setTimeout(() => {
            addMessage('bot', greeting.text, { options: greeting.options });
            setIsTyping(true);
            setTimeout(() => {
                addMessage('bot', followup.text, { options: followup.options });
                setSession(prev => {
                    const newSession = { ...prev, step: 'greeting_followup' };
                    saveSession(newSession);
                    return newSession;
                });
                setIsTyping(false);
            }, delay2);
        }, delay1);
    }, [addMessage, saveSession]);

    const resetSession = useCallback(() => {
        localStorage.removeItem('chatbotSession');
        setMessages([]);
        setOptionsState('initial');
        setIsLoading(true);
        setShowFinalization(false);
        setShowOptionsDelayed(false);
        const newSession = loadSession();
        setSession(newSession);
        setTimeout(() => {
            setIsLoading(false);
            const joinMessage = { id: `agent-join-${Date.now()}`, text: `${newSession.agentName} се присъедини.`, sender: 'system' };
            setMessages([joinMessage]);
            handleGreeting(newSession.agentName);
        }, 1500);
        toast({ title: "Сесията е нулирана.", description: "Започвате нов разговор." });
    }, [loadSession, toast, handleGreeting]);

    useEffect(() => {
        if (isChatOpen) {
            const currentSession = loadSession();
            setSession(currentSession);
            setIsLoading(true);
            setTimeout(() => {
                setIsLoading(false);
                if (currentSession.messages.length === 0) {
                    const joinMessage = { id: `agent-join-${Date.now()}`, text: `${currentSession.agentName} се присъедини.`, sender: 'system' };
                    setMessages([joinMessage]);
                    
                    if (initialFlow === 'profileFlow') {
                        setInitialFlow(null);
                        const userMessage = {id: Date.now(), text: 'Създай профил', sender: 'user'};
                        const updatedMessages = [joinMessage, userMessage];
                        setMessages(updatedMessages);
                        handleConversationFlow('Създай профил', { ...currentSession, messages: updatedMessages });
                    } else {
                        handleGreeting(currentSession.agentName);
                    }
                } else {
                    setMessages(currentSession.messages);
                }
            }, 1000);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChatOpen, initialFlow, setInitialFlow]);

    return {
        session, messages, inputValue, setInputValue, isLoading, isTyping, validationError,
        setValidationError, showFinalization, isProcessing, showOptionsDelayed,
        handleOptionClick, handleSubmit, resetSession
    };
};
