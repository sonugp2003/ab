
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Heart, Library, BookUser, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUseCase } from '@/context/use-case-context';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const { useCase, setUseCase, terminology } = useUseCase();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleUseCaseSelection = (selectedCase: 'room' | 'library') => {
    setUseCase(selectedCase);
  };
  
  const useCases = [
      {
          key: 'room',
          icon: <Briefcase className="w-12 h-12 text-primary"/>,
          title: "Roommate Hub",
          description: "For Property Owners and Tenants",
          action: "Select Use Case"
      },
      {
          key: 'library',
          icon: <Library className="w-12 h-12 text-primary"/>,
          title: "Library Hub",
          description: "For Librarians and Students",
          action: "Select Use Case"
      }
  ]

  const featureCards = [
    {
      icon: <Briefcase className="w-8 h-8 text-primary" />,
      title: `For ${terminology.owner.title}`,
      description: terminology.owner.description,
      link: '/owner/login',
      linkText: `${terminology.owner.title} Login`,
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: `For ${terminology.tenant.title}`,
      description: terminology.tenant.description,
      link: '/tenant/login',
      linkText: `${terminology.tenant.title} Login`,
    },
  ];

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative flex flex-col items-center justify-center"
            >
              <div className="absolute w-48 h-48 rounded-full bg-primary/20 animate-pulse-slow"></div>
              <Image src="/logo.png" alt="Roommate Hub Logo" width={80} height={80} className="z-10" data-ai-hint="logo building" />
              <h1 className="text-4xl font-bold z-10 mt-4 animate-shine bg-gradient-to-r from-[#FF4500] via-yellow-300 to-[#FF4500] bg-[length:200%_100%] bg-clip-text text-transparent">Roommate Hub</h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSplash && (
        <motion.main
          key="main-content"
          className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 overflow-hidden relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          { !useCase ? (
            <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h1 className="text-5xl font-bold tracking-tight mb-4">Choose Your Use Case</h1>
                <p className="text-muted-foreground mb-12">Select how you'd like to use this application.</p>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {useCases.map(uc => (
                         <Card key={uc.key} className="cursor-pointer rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 bg-card/60 backdrop-blur-sm border-primary/20">
                            <CardHeader className="items-center text-center">
                                {uc.icon}
                                <CardTitle className="mt-4 text-3xl">{uc.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{uc.description}</CardDescription>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button onClick={() => handleUseCaseSelection(uc.key as 'room' | 'library')} size="lg" className="w-full">
                                    {uc.action}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </motion.div>
          ) : (
          <>
          <div className="absolute top-4 right-4">
              <Button variant="outline" onClick={() => setUseCase(null)}>
                <RefreshCw className="mr-2 h-4 w-4"/> Change Use Case
              </Button>
          </div>

          <header className="text-center mb-16">
            <motion.div
              className="flex justify-center items-center mb-6"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            >
               <h1 className="text-6xl font-bold tracking-tighter animate-shine bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-[length:200%_100%] bg-clip-text text-transparent">
                {terminology.appName}
              </h1>
            </motion.div>
            <motion.p
              className="text-md text-muted-foreground max-w-lg mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {terminology.appDescription}
            </motion.p>
          </header>

          <motion.div
            className="grid gap-8 md:grid-cols-2 max-w-4xl w-full"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                opacity: 1,
                transition: {
                  delayChildren: 0.8,
                  staggerChildren: 0.3,
                },
              },
              hidden: { opacity: 0 },
            }}
          >
            {featureCards.map((card, index) => (
              <motion.div
                key={index}
                variants={{
                  visible: { y: 0, opacity: 1 },
                  hidden: { y: 30, opacity: 0 },
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Card className="h-full flex flex-col rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 bg-card/60 backdrop-blur-sm border-primary/20">
                  <CardHeader className="items-center text-center">
                    {card.icon}
                    <CardTitle className="mt-4 text-2xl">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow text-center">
                    <CardDescription>{card.description}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Link href={card.link} passHref>
                      <Button className="w-full" variant="default" size="lg">
                        {card.linkText}
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.footer
            className="mt-16 text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
          >
            <p className="text-xs flex items-center justify-center gap-1">with <Heart className="w-3 h-3 text-red-500 fill-current" /> from Ashok samrat and Sonu Gupta</p>
          </motion.footer>
          </>
          )}
        </motion.main>
      )}
    </>
  );
}
