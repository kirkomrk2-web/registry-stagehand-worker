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
        
        const { agentName, step, userData, sessionId } = currentSession;
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
                const baseDelay = 1200;
                const randomVariation = Math.random() * 800;
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

        // ⭐ FIX: "Вход" button handler (NO addMessage here to avoid duplicate)
        if (userInput === "Вход" && step === 'profileExists') {
            const email = userData.email;
            simulateTyping(() => {
                addBotMessage({
                    text: `За да влезете с ${email}, моля проверете вашия имейл за линк за вход. Ако нямате имейл, свържете се с нашия екип.`,
                    options: [{ text: "Контакти", icon: "Mail" }]
                });
            }, 1000);
            return;
        }
        
        // ⭐ v3 FIX: "Контакти" button handler with FULL FIXES
        if (userInput === "Контакти") {
            // Email domain: wallesters.com
            const agentEmail = `${agent.nameEn}@wallesters.com`;
            
            // Telegram and Instagram usernames
            const agentTelegram = agent.telegram;
            const agentInstagram = agent.instagram;
            
            // Pre-filled message for Telegram
            const telegramMessage = encodeURIComponent("Здравей, имам нужда от твоята помощ");
            const telegramUrl = `https://t.me/${agentTelegram}?text=${telegramMessage}`;
            
            // Instagram profile URL
            const instagramUrl = `https://instagram.com/${agentInstagram}`;
            
            simulateTyping(() => {
                addBotMessage({
                    text: `Винаги можете да се свържете с мен за допълнително съдействие:\n\n📧 Email: ${agentEmail}\n💬 Telegram: @${agentTelegram}\n📷 Instagram: @${agentInstagram}\n⏰ Работно време: Пон-Пет, 9:00-18:00`,
                    options: [
                        { 
                            text: "Пиши в Telegram", 
                            icon: "Send", 
                            action: "openLink",
                            url: telegramUrl 
                        },
                        { 
                            text: "Отвори Instagram", 
                            icon: "Instagram", 
                            action: "openLink",
                            url: instagramUrl 
                        },
                        { 
                            text: "Изпрати имейл", 
                            icon: "Mail", 
                            action: "openLink",
                            url: `mailto:${agentEmail}` 
                        }
                    ]
                });
            }, 1000);
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
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidName')), 800);
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
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidDateFormat')), 800);
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
                    simulateTyping(() => addBotMessage(getAgentResponse('invalidEmail')), 800);
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

                    const fullName = [finalUserData.firstName, finalUserData.patronymicName, finalUserData.lastName].filter(Boolean).join(' ');
                    
                    simulateTyping(() => {
                        addBotMessage({
                            text: "Перфектно! Обработваме вашите данни и проверяваме в Търговския регистър. Това може да отнеме 2-3 минути. Моля, изчакайте...",
                            options: null,
                            quickResponse: true
                        });
                    }, 800);
                    
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await checkRegistry({ full_name: fullName, email: finalUserData.email });
                    
                    console.log('[INFO] Triggering users_pending_worker...');
                    try {
                        const { data: workerResult, error: workerError } = await supabase.functions.invoke(
                            'users_pending_worker',
                            {
                                body: JSON.stringify({
                                    row: {
                                        full_name: fullName,
                                        email: finalUserData.email,
                                        status: 'pending'
                                    }
                                })
                            }
                        );
                        
                        if (workerError) {
                            console.error('[ERROR] users_pending_worker failed:', workerError);
                        } else {
                            console.log('[INFO] users_pending_worker completed:', workerResult);
                        }
                    } catch (workerErr) {
                        console.error('[ERROR] Exception calling users_pending_worker:', workerErr);
                    }
                    
                    simulateTyping(() => { 
                        updateSession({step: 'dataSent', optionsState: 'unlocked'}); 
                        const response = getAgentResponse('dataSent');
                        addBotMessage(response);
                    }, 2500);

                } catch (error) {
                    console.error("Process failed:", error);
                    addBotMessage(getAgentResponse('fallback'));
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
        setIsTyping(true);
        setTimeout(() => {
            addMessage('bot', getAgentResponse('greeting').text, { options: getAgentResponse('greeting').options });
            setIsTyping(false);
            setTimeout(() => {
                setIsTyping(true);
                setTimeout(() => {
                    addMessage('bot', getAgentResponse('greeting_followup').text, { options: getAgentResponse('greeting_followup').options });
                    setSession(prev => {
                        const newSession = { ...prev, step: 'greeting_followup' };
                        saveSession(newSession);
                        return newSession;
                    });
                    setIsTyping(false);
                }, 1500);
            }, 2000);
        }, 1800);
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
