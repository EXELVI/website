"use client";

import React, { useState, useContext, createContext } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge, badgeVariants } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { cn } from "../lib/utils";
import {
    MessageSquare,
    MapPin,
    GraduationCap,
    Palette,
    Globe,
    ExternalLink,
    Terminal,
    Code2,
    Smartphone,
    Database,
    ChevronDown,
    ChevronUp,
    Mail,
    Calendar,
    Star,
    Play,
    Download,
    Users,
    TrendingUp
} from "lucide-react";
import { SiDotnet, SiMongodb, SiTypescript } from "react-icons/si";
import { VscVscode } from "react-icons/vsc";
import { FaTiktok, FaTwitch, FaDiscord, FaReact, FaTwitter, FaInstagram, FaYoutube, FaGithub, FaGitAlt, FaNodeJs  } from "react-icons/fa";
import { IoLogoJavascript } from "react-icons/io5";
import BlurText from "./components/animations/BlurText";
import DraggableTerminal from "./components/DraggableTerminal";

const CustomBadge: React.FC<{
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
}> = ({ children, className, variant }) => {
    return <div className={cn(badgeVariants({ variant }), className)}>{children}</div>;
};

const TranslationContext = createContext<{
    t: (key: string) => string;
    language: string;
    changeLanguage: (lang: string) => void;
} | null>(null);

const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error("useTranslation must be used within a TranslationProvider");
    }
    return context;
};

// MARK: Translations
const translations = {
    it: {
        greeting: "Ciao, sono",
        intro: "Studente in un istituto tecnico con indirizzo informatica e telecomunicazioni, appassionato di informatica e programmazione",
        buttonExplore: "Esplora i miei progetti",
        mainProjects: "Progetti principali",
        showMore: "Mostra altri progetti",
        showLess: "Nascondi altri progetti",
        open: "Apri",
        try: "Prova",
        repository: "Repository",
        viewAll: "Visualizza tutti i progetti",
        about: "Chi sono",
        skills: "Competenze",
        contact: "Contattami",
        projects: {
            randomGenerator: {
                title: "Generatore di numeri casuali",
                description:
                    "Un generatore di numeri casuali che consente di selezionare la quantità di numeri da generare, l'intervallo desiderato e di escludere numeri specifici con dei salvataggi."
            },
            terminal: {
                title: "Terminal",
                description:
                    "Si tratta di un'applicazione terminale basata sul web e realizzata con HTML, CSS e JavaScript. Realizzato originario per scopi di portfolio, è una semplice implementazione di un'interfaccia terminale che consente agli utenti di eseguire comandi, navigare nel file system, ecc..."
            },
            passwordGenerator: {
                title: "Password Generator",
                description:
                    "Un generatore di password che consente di selezionare la lunghezza della password e di includere caratteri speciali, numeri, lettere maiuscole e molto altro."
            },
            sshTerminal: {
                title: "SSH Terminal",
                description:
                    "Un terminale SSH realizzato in Node.js utilizzando ssh2, con un'ampia gamma di comandi, gestione degli utenti e persino giochi integrati per un'esperienza divertente."
            }
        },
        information: "Informazioni",
        schoolDirection: "Indirizzo scolastico",
        schoolValue: "Informatica e telecomunicazioni",
        position: "Posizione",
        positionValue: "Veneto, Italia",
        favoriteColor: "Colore preferito",
        favoriteColorValue: "Blu",
        favoriteLanguage: "Linguaggio preferito",
        favoriteLanguageValue: "JavaScript",
        social: "Social",
        socialText: "Seguimi sui social per rimanere aggiornato sui miei progetti e contenuti",
        visitMy: "Visita il mio",
        copyright: `© ${new Date().getFullYear()} EXELVI - Tutti i diritti riservati.`
    },
    en: {
        greeting: "Hi, I'm",
        intro: "Student at a technical institute with a focus on computer science and telecommunications, passionate about programming and technology",
        buttonExplore: "Explore my projects",
        mainProjects: "Main Projects",
        showMore: "Show more projects",
        showLess: "Hide other projects",
        open: "Open",
        try: "Try",
        repository: "Repository",
        viewAll: "View all projects",
        about: "About me",
        skills: "Skills",
        contact: "Contact me",
        projects: {
            randomGenerator: {
                title: "Random Number Generator",
                description:
                    "A random number generator that allows you to select the quantity of numbers to generate, the desired range, and exclude specific numbers with saves."
            },
            terminal: {
                title: "Terminal",
                description:
                    "This is a web-based terminal application made with HTML, CSS, and JavaScript. Originally created for portfolio purposes, it's a simple implementation of a terminal interface that allows users to execute commands, navigate the file system, etc..."
            },
            passwordGenerator: {
                title: "Password Generator",
                description:
                    "A password generator that allows you to select the password length and include special characters, numbers, uppercase letters, and much more."
            },
            sshTerminal: {
                title: "SSH Terminal",
                description:
                    "An SSH terminal made in Node.js using ssh2, with a wide range of commands, user management, and even built-in games for a fun experience."
            }
        },
        information: "Information",
        schoolDirection: "School Direction",
        schoolValue: "Computer Science and Telecommunications",
        position: "Position",
        positionValue: "Veneto, Italy",
        favoriteColor: "Favorite Color",
        favoriteColorValue: "Blue",
        favoriteLanguage: "Favorite Language",
        favoriteLanguageValue: "JavaScript",
        social: "Social",
        socialText: "Follow me on social media to stay updated on my projects and content",
        visitMy: "Visit my",
        copyright: `© ${new Date().getFullYear()} EXELVI - All rights reserved.`
    }
};
 
const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    //  IT come lingua SSR predefinita per allineare SEO/SSR
    const [language, setLanguage] = useState("it");
    const [isClient, setIsClient] = useState(false);

    React.useEffect(() => {
        setIsClient(true);
        if (typeof window !== "undefined") {
            const userLang = navigator.language || (navigator as any).userLanguage;
            // IT prioritario, altrimenti EN
            const detectedLang = userLang?.startsWith("it") ? "it" : "en";
            setLanguage(detectedLang);
        }
    }, []);

    const t = (key: string): string => {
        const keys = key.split(".");
        let value: any = translations[language as keyof typeof translations];

        for (const k of keys) {
            value = value?.[k];
        }

        return value || key;
    };

    const changeLanguage = (newLanguage: string) => {
        setLanguage(newLanguage);
    };

    return (
        <TranslationContext.Provider value={{ t, language, changeLanguage }}>{children}</TranslationContext.Provider>
    );
};
 
const LanguageSelector: React.FC = () => {
    const { language, changeLanguage } = useTranslation();

    return (
        <div className="flex items-center gap-2 text-slate-200">
            <Globe className="h-4 w-4 text-blue-400" />
            <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-auto border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-500">
                    <SelectItem value="it" className="text-slate-200 hover:bg-slate-600">
                        🇮🇹 Italiano
                    </SelectItem>
                    <SelectItem value="en" className="text-slate-200 hover:bg-slate-600">
                        🇬🇧 English
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};

// MARK: Hero Section
 
const HeroSection: React.FC = () => {
    const { t } = useTranslation();
    const [particlePositions, setParticlePositions] = useState<Array<{ left: number; top: number; width: number; height: number }>>([]);
 
    React.useEffect(() => {
        const particles = Array.from({ length: 50 }, () => ({
            left: Math.random() * 100,
            top: Math.random() * 100,
            width: Math.random() * 6 + 2, // 4 + 1
            height: Math.random() * 6 + 2
        }));
        setParticlePositions(particles);
    }, []);

    const scrollToProjects = () => {
        document.getElementById("projects-section")?.scrollIntoView({
            behavior: "smooth"
        });
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
            {/* Background animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-10 opacity-50">  
                    {particlePositions.map((particle, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-blue-500/20 rounded-full"
                            style={{
                                left: `${particle.left}%`,
                                top: `${particle.top}%`,
                                width: `${particle.width}px`,
                                height: `${particle.height}px`
                            }}
                            animate={{
                                y: [-20, 20, -20],
                                opacity: [0.4, 1, 0.4] //   [0.2, 0.8, 0.2]  
                            }}
                            transition={{
                                duration: Math.random() * 3 + 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6">
                    <Avatar className="w-40 h-40 mx-auto mb-8 ring-4 ring-blue-500/30">
                        <AvatarImage src="/img/exelvi_profile.png" alt="EXELVI" />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-600 to-cyan-600">
                            EX
                        </AvatarFallback>
                    </Avatar>

                    <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                        {t("greeting")}{" "}
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            EXELVI
                        </span>
                    </h1>

                    <div className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        <BlurText
                            text={t("intro")}
                            delay={50}
                            animateBy="words"
                            direction="top"
                            animationFrom={null}
                            animationTo={null}
                            onAnimationComplete={() => {}}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex justify-center mt-8">
                        <Button
                            size="lg"
                            className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 text-lg"
                            onClick={scrollToProjects}>
                            <Code2 className="mr-2 h-5 w-5" />
                            {t("buttonExplore")}
                        </Button>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <ChevronDown className="h-6 w-6 text-blue-400" />
            </motion.div>
        </section>
    );
};

// MARK: Projects Section
 
const ProjectsSection: React.FC = () => {
    const { t } = useTranslation();
    const [showHidden, setShowHidden] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);

    const mainProjects = [
        {
            title: t("projects.randomGenerator.title"),
            description: t("projects.randomGenerator.description"),
            image: "/img/Screenshot_25-3-2024_12449_exelvi.github.io.jpeg",
            link: "https://exelvi.github.io/generatore/",
            tags: ["JavaScript", "HTML", "CSS", "Bootstrap"],
            featured: true
        },
        {
            title: t("projects.terminal.title"),
            description: t("projects.terminal.description"),
            image: "/img/screen.png",
            link: "https://exelvi.github.io/terminal",
            tags: ["JavaScript", "HTML", "CSS"],
            isTerminal: true,
            featured: true
        }
    ];

    const hiddenProjects = [
        {
            title: t("projects.passwordGenerator.title"),
            description: t("projects.passwordGenerator.description"),
            image: "https://raw.githubusercontent.com/EXELVI/password_generator/main/screen.png",
            link: "https://exelvi.github.io/password_generator",
            tags: ["JavaScript", "HTML", "CSS", "Bootstrap"]
        },
        {
            title: t("projects.sshTerminal.title"),
            description: t("projects.sshTerminal.description"),
            image: "https://raw.githubusercontent.com/EXELVI/ssh-terminal/main/assets/screen.png",
            repoLink: "https://github.com/EXELVI/ssh-terminal",
            tags: ["Node.js", "SSH"]
        }
    ];

    const handleCloseTerminal = () => {
        setShowTerminal(false);
    };

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            if (localStorage.getItem("terminalStayOpen") === "true") {
                setShowTerminal(true);
            }
            if (localStorage.getItem("reopenTerminal") === "true") {
                setShowTerminal(true);
                localStorage.removeItem("reopenTerminal");
            }
        }
    }, []);

    return (
        <>
            {showTerminal && <DraggableTerminal onClose={handleCloseTerminal} />}
            <section id="projects-section" className="py-12 px-4 bg-slate-950">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="text-center mb-8">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            {t("mainProjects")}
                        </h2>
                    </motion.div>

                    {/* Featured Projects */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {mainProjects.map((project, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="h-full">
                                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 group h-full flex flex-col">
                                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                        <img
                                            src={project.image}
                                            alt={project.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                        {project.featured && (
                                            <CustomBadge className="absolute top-4 right-4 bg-blue-600">
                                                <Star className="w-3 h-3 mr-1" />
                                                Featured
                                            </CustomBadge>
                                        )}
                                    </div>
                                    <CardHeader className="flex-grow-0">
                                        <CardTitle className="text-white">{project.title}</CardTitle>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {project.tags.map((tag, tagIndex) => (
                                                <CustomBadge
                                                    key={tagIndex}
                                                    variant="secondary"
                                                    className="bg-slate-700 text-slate-300">
                                                    {tag}
                                                </CustomBadge>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <CardDescription className="text-slate-400 leading-relaxed" data-nosnippet>
                                            {project.description}
                                        </CardDescription>
                                    </CardContent>
                                    <CardFooter className="flex gap-2 pt-0 mt-auto">
                                        {project.isTerminal && (
                                            <Button
                                                size="sm"
                                                onClick={() => setShowTerminal(true)}
                                                className="bg-blue-600 hover:bg-blue-700 flex-1">
                                                <Play className="mr-2 h-4 w-4" />
                                                {t("try")}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(project.link, "_blank")}
                                            className={`border-blue-500 text-blue-700 hover:bg-blue-500/20 hover:text-blue-200 ${project.isTerminal ? "flex-1" : "w-full"}`}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            {t("open")}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Show More/Less Button */}
                    <div className="text-center mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => setShowHidden(!showHidden)}
                            className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/20 border border-blue-500/30">
                            {showHidden ? (
                                <>
                                    <ChevronUp className="mr-2 h-4 w-4" />
                                    {t("showLess")}
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="mr-2 h-4 w-4" />
                                    {t("showMore")}
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Hidden Projects */}
                    <motion.div
                        initial={false}
                        animate={{
                            height: showHidden ? "auto" : 0,
                            opacity: showHidden ? 1 : 0
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {hiddenProjects.map((project, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={showHidden ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                    transition={{ duration: 0.5, delay: showHidden ? index * 0.1 : 0 }}
                                    className="h-full">
                                    <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 group h-full flex flex-col">
                                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                            <img
                                                src={project.image}
                                                alt={project.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                        </div>
                                        <CardHeader className="flex-grow-0">
                                            <CardTitle className="text-white">{project.title}</CardTitle>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {project.tags.map((tag, tagIndex) => (
                                                    <CustomBadge
                                                        key={tagIndex}
                                                        variant="secondary"
                                                        className="bg-slate-700 text-slate-300">
                                                        {tag}
                                                    </CustomBadge>
                                                ))}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <CardDescription className="text-slate-400 leading-relaxed" data-nosnippet>
                                                {project.description}
                                            </CardDescription>
                                        </CardContent>
                                        <CardFooter className="pt-0 mt-auto">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(project.link || project.repoLink, "_blank")}
                                                className="border-blue-500 text-blue-700 hover:bg-blue-500/20 hover:text-blue-200 w-full">
                                                {project.repoLink ? (
                                                    <>
                                                        <FaGithub className="mr-2 h-4 w-4" />
                                                        {t("repository")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        {t("open")}
                                                    </>
                                                )}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
};

// MARK: About Section
 
const AboutSection: React.FC = () => {
    const { t } = useTranslation();

    const skills = [
        { name: "JavaScript", icon: <IoLogoJavascript className="h-5 w-5" /> },
        { name: "TypeScript", icon: <SiTypescript className="h-5 w-5" /> },
        { name: "React", icon: <FaReact className="h-5 w-5" /> },
        { name: "Node.js", icon: <FaNodeJs className="h-5 w-5" /> },
        { name: "HTML/CSS", icon: <Code2 className="h-5 w-5" /> },
        { name: "MongoDB", icon: <SiMongodb className="h-5 w-5" /> },
        { name: "Git", icon: <FaGitAlt className="h-5 w-5" /> },
        { name: "VS Code", icon: <VscVscode className="h-5 w-5" /> },
        { name: "Visual Basic", icon: <SiDotnet className="h-5 w-5" /> }
    ];

    const info = [
        {
            icon: <GraduationCap className="h-6 w-6 text-blue-400" />,
            title: t("schoolDirection"),
            value: t("schoolValue")
        },
        {
            icon: <MapPin className="h-6 w-6 text-blue-400" />,
            title: t("position"),
            value: t("positionValue")
        },
        {
            icon: <Palette className="h-6 w-6 text-blue-400" />,
            title: t("favoriteColor"),
            value: t("favoriteColorValue")
        },
        {
            icon: <IoLogoJavascript className="h-6 w-6 text-blue-400" />,
            title: t("favoriteLanguage"),
            value: t("favoriteLanguageValue")
        }
    ];

    return (
        <section className="py-1 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center mb-6">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {t("about")}
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">{t("information")}</h3>
                    <div className="max-w-4xl mx-auto">
                        {/* First row: 2/3 - 1/3 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                viewport={{ once: true }}
                                className="md:col-span-2">
                                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-blue-500/20">{info[0].icon}</div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-300">{info[0].title}</h4>
                                                <p className="text-white font-semibold">{info[0].value}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                viewport={{ once: true }}>
                                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-blue-500/20">{info[1].icon}</div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-300">{info[1].title}</h4>
                                                <p className="text-white font-semibold">{info[1].value}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Second row: 1/3 - 2/3 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                viewport={{ once: true }}>
                                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-blue-500/20">{info[2].icon}</div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-300">{info[2].title}</h4>
                                                <p className="text-white font-semibold">{info[2].value}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                viewport={{ once: true }}
                                className="md:col-span-2">
                                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors duration-300 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-blue-500/20">{info[3].icon}</div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-300">{info[3].title}</h4>
                                                <p className="text-white font-semibold">{info[3].value}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Skills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">{t("skills")}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {skills.map((skill, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:bg-slate-800/70 transition-colors duration-300">
                                <div className="flex items-center justify-center gap-3 text-center">
                                    <div className="text-blue-400">{skill.icon}</div>
                                    <span className="text-white font-medium">{skill.name}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

// MARK: Social Section

const SocialSection: React.FC = () => {
    const { t } = useTranslation();

    const socials = [
        {
            icon: <FaGithub className="h-6 w-6" />,
            name: "GitHub",
            link: "https://github.com/EXELVI",
            color: "hover:text-gray-400"
        },
        {
            icon: <FaYoutube className="h-6 w-6" />,
            name: "YouTube",
            link: "https://www.youtube.com/@exelvi",
            color: "hover:text-red-400"
        },
        {
            icon: <FaInstagram className="h-6 w-6" />,
            name: "Instagram",
            link: "https://www.instagram.com/exelviofficial/",
            color: "hover:text-pink-400"
        },
        {
            icon: <FaTwitter className="h-6 w-6" />,
            name: "Twitter",
            link: "https://x.com/exelvi1",
            color: "hover:text-blue-400"
        },
        {
            icon: <FaDiscord className="h-6 w-6" />,
            name: "Discord",
            link: "https://discord.com/users/462339171537780737",
            color: "hover:text-indigo-400"
        },
        {
            icon: <FaTiktok className="h-6 w-6" />,
            name: "TikTok",
            link: "https://www.tiktok.com/@exelvi",
            color: "hover:text-pink-400"
        },
        {
            icon: <FaTwitch className="h-6 w-6" />,
            name: "Twitch",
            link: "https://www.twitch.tv/exelvii",
            color: "hover:text-blue-400"
        }
    ];

    return (
        <section className="py-8 px-4 bg-slate-900">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="mb-6">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {t("social")}
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        {t("socialText")}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {socials.map((social, index) => (
                        <TooltipProvider key={index}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <motion.a
                                        href={social.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`group p-4 bg-slate-700/50 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-300 hover:scale-105 ${social.color}`}
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.95 }}>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-slate-300 group-hover:scale-110 transition-transform duration-300">
                                                {social.icon}
                                            </div>
                                            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                                {social.name}
                                            </span>
                                        </div>
                                    </motion.a>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t("visitMy")} {social.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

const Footer: React.FC = () => {
    return (
        <footer className="py-6 px-4 bg-slate-950 border-t border-slate-800">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-slate-400 text-sm">© {new Date().getFullYear()} EXELVI - Tutti i diritti riservati.</div>
                    <LanguageSelector />
                </div>
            </div>
        </footer>
    );
};

// Main Home Page 
function HomePage() {
    return (
        <TooltipProvider>
            <div className="min-h-screen bg-slate-900" style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                backgroundColor: '#0f172a', 
                minHeight: '100dvh' 
            }}>
                <HeroSection />
                <ProjectsSection />
                <AboutSection />
                <SocialSection />
                <Footer />
            </div>
        </TooltipProvider>
    );
}
 
export default function App() {
    return (
        <TranslationProvider>
            <HomePage />
        </TranslationProvider>
    );
}
