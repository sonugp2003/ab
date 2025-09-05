
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type UseCaseType = 'room' | 'library' | null;

interface Terminology {
    appName: string;
    appDescription: string;
    owner: {
        title: string;
        singular: string;
        plural: string;
        description: string;
        dashboardHeader: string;
        collectionName: string;
    },
    tenant: {
        title: string;
        singular: string;
        plural: string;
        description: string;
        dashboardHeader: string;
        paidMessage: string;
        collectionName: string;
    },
    rent: {
        singular: string;
        plural: string;
    },
    room: {
        singular: string;
        placeholder: string;
    },
    roomCode: {
        singular: string;
    },
    address: {
        singular: string;
        placeholder: string;
    },
    property: {
        title: string;
    },
    revenue: {
        title: string;
    }
}

const terminologyMap: Record<NonNullable<UseCaseType>, Terminology> = {
    room: {
        appName: "Roommate Hub",
        appDescription: "The all-in-one platform for seamless property and payment management.",
        owner: {
            title: "Room Owner",
            singular: "Owner",
            plural: "Owners",
            description: "Streamline tenant management, track payments, and communicate effortlessly.",
            dashboardHeader: "Here's a summary of your properties.",
            collectionName: "roomOwners"
        },
        tenant: {
            title: "Tenant",
            singular: "Tenant",
            plural: "Tenants",
            description: "Pay rent, view payment history, and communicate with your owner with ease.",
            dashboardHeader: "Here's your rental dashboard.",
            paidMessage: "Your rent for this month is fully paid. Thank you!",
            collectionName: "tenants"
        },
        rent: {
            singular: "Rent",
            plural: "Rents"
        },
        room: {
            singular: "Room / Unit No.",
            placeholder: "e.g., Room 101"
        },
        roomCode: {
            singular: "Room Code"
        },
        address: {
            singular: "Property Address",
            placeholder: "123 Main St, City"
        },
        property: {
            title: "Property Details"
        },
        revenue: {
            title: "Revenue"
        }
    },
    library: {
        appName: "Library Hub",
        appDescription: "The all-in-one platform for seamless library and fee management.",
        owner: {
            title: "Librarian",
            singular: "Librarian",
            plural: "Librarians",
            description: "Manage students, track seat allocation, and handle fees efficiently.",
            dashboardHeader: "Here's a summary of your library's activity.",
            collectionName: "librarians"
        },
        tenant: {
            title: "Student",
            singular: "Student",
            plural: "Students",
            description: "View your seat allocation, pay fees, and check library announcements.",
            dashboardHeader: "Here's your library dashboard.",
            paidMessage: "You have no outstanding fees. Thank you!",
            collectionName: "students"
        },
        rent: {
            singular: "Money",
            plural: "Money"
        },
        room: {
            singular: "Seat Number",
            placeholder: "e.g., Seat #A12"
        },
        roomCode: {
            singular: "Student ID"
        },
        address: {
            singular: "Library Address",
            placeholder: "123 Library Lane, City"
        },
        property: {
            title: "Library Details"
        },
        revenue: {
            title: "Fees Collected"
        }
    }
};

interface UseCaseContextType {
    useCase: UseCaseType;
    setUseCase: (useCase: UseCaseType) => void;
    terminology: Terminology;
}

const UseCaseContext = createContext<UseCaseContextType | undefined>(undefined);

export const UseCaseProvider = ({ children }: { children: ReactNode }) => {
    const [useCase, setUseCaseState] = useState<UseCaseType>(null);
    const [terminology, setTerminology] = useState<Terminology>(terminologyMap.room); // Default to room

    useEffect(() => {
        const storedUseCase = localStorage.getItem('useCase') as UseCaseType;
        if (storedUseCase && (storedUseCase === 'room' || storedUseCase === 'library')) {
            setUseCaseState(storedUseCase);
            setTerminology(terminologyMap[storedUseCase]);
        }
    }, []);

    const setUseCase = (selectedCase: UseCaseType) => {
        if (selectedCase) {
            localStorage.setItem('useCase', selectedCase);
            setUseCaseState(selectedCase);
            setTerminology(terminologyMap[selectedCase]);
        } else {
            localStorage.removeItem('useCase');
            setUseCaseState(null);
            // Optionally reset to a default terminology or keep the last one
            setTerminology(terminologyMap.room); 
        }
    };
    
    return (
        <UseCaseContext.Provider value={{ useCase, setUseCase, terminology }}>
            {children}
        </UseCaseContext.Provider>
    );
};

export const useUseCase = () => {
    const context = useContext(UseCaseContext);
    if (context === undefined) {
        throw new Error('useUseCase must be used within a UseCaseProvider');
    }
    return context;
};

    