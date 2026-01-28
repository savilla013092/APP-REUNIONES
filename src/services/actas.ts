import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import type { Acta } from "../types";
import {
    isDemoMode,
    getDemoActas,
    getDemoActa,
    saveDemoActa,
    updateDemoActa,
} from "./mockData";

const ACTAS_COLLECTION = "actas";

// Flag to track if we should use demo mode due to Firebase permission errors
let useDemoModeFallback = false;

// Export function to check if we're using demo mode fallback
export const isUsingDemoFallback = (): boolean => useDemoModeFallback;

// Export function to force demo mode fallback
export const enableDemoFallback = (): void => {
    useDemoModeFallback = true;
    console.log("Demo mode fallback enabled");
};

// Helper to check if error is a permission error
const isPermissionError = (error: any): boolean => {
    const message = error?.message || error?.code || "";
    return message.includes("permission") || message.includes("Permission") ||
           message.includes("PERMISSION_DENIED") || message.includes("insufficient");
};

// Check if we should use demo mode (either configured or fallback due to errors)
const shouldUseDemoMode = (): boolean => {
    return isDemoMode() || useDemoModeFallback;
};

export const saveActa = async (actaData: Partial<Acta>): Promise<string> => {
    // Demo mode: use localStorage
    if (shouldUseDemoMode()) {
        console.log("Guardando acta en modo demo (localStorage)");
        return saveDemoActa(actaData);
    }

    // Production mode: use Firestore
    try {
        const docRef = await addDoc(collection(db, ACTAS_COLLECTION), {
            ...actaData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving acta:", error);
        // If permission error, fallback to demo mode
        if (isPermissionError(error)) {
            console.warn("Firebase permission error - switching to demo mode (localStorage)");
            useDemoModeFallback = true;
            return saveDemoActa(actaData);
        }
        throw error;
    }
};

export const updateActa = async (id: string, actaData: Partial<Acta>): Promise<void> => {
    // Demo mode: use localStorage
    if (shouldUseDemoMode()) {
        updateDemoActa(id, actaData);
        return;
    }

    // Production mode: use Firestore
    try {
        const docRef = doc(db, ACTAS_COLLECTION, id);
        await updateDoc(docRef, {
            ...actaData,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error updating acta:", error);
        if (isPermissionError(error)) {
            console.warn("Firebase permission error - switching to demo mode");
            useDemoModeFallback = true;
            updateDemoActa(id, actaData);
            return;
        }
        throw error;
    }
};

export const getActa = async (id: string): Promise<Acta | null> => {
    // Demo mode: use localStorage
    if (shouldUseDemoMode()) {
        return getDemoActa(id);
    }

    // Production mode: use Firestore
    try {
        const docRef = doc(db, ACTAS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Acta;
        }
        return null;
    } catch (error) {
        console.error("Error getting acta:", error);
        if (isPermissionError(error)) {
            console.warn("Firebase permission error - switching to demo mode");
            useDemoModeFallback = true;
            return getDemoActa(id);
        }
        throw error;
    }
};

export const getOrganizationActas = async (organizationId: string): Promise<Acta[]> => {
    // Demo mode: use localStorage
    if (shouldUseDemoMode()) {
        return getDemoActas(organizationId);
    }

    // Production mode: use Firestore
    try {
        const q = query(
            collection(db, ACTAS_COLLECTION),
            where("organizationId", "==", organizationId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Acta));
    } catch (error) {
        console.error("Error getting organization actas:", error);
        if (isPermissionError(error)) {
            console.warn("Firebase permission error - using demo mode");
            useDemoModeFallback = true;
            return getDemoActas(organizationId);
        }
        throw error;
    }
};
