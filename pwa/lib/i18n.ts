'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getLanguage,
    setLanguage,
    LANGUAGE_EVENT,
    type Language,
} from './language';

/* ==========================================================================
   i18n
   Lightweight string dictionary. Keys map to per-language strings with
   optional {placeholders}. Untranslated keys fall back to English.
   ========================================================================== */

const en: Record<string, string> = {
    // ---- Navigation ----
    'nav.home': 'Home',
    'nav.stats': 'Stats',
    'nav.league': 'League',
    'nav.settings': 'Settings',

    // ---- Player selector ----
    'ps.whoAreYou': 'Who are you?',
    'ps.selectToContinue': 'Select your profile to continue.',
    'ps.search': 'Search players...',
    'ps.lastUsed': 'Last used',
    'ps.welcome': 'Welcome, {name}',
    'ps.noPlayersFound': 'No players found',
    'ps.noPlayersDesc': 'Try a different search.',
    'ps.firstPlayerTitle': 'No players yet',
    'ps.firstPlayerDesc': 'Create the first profile to get started.',
    'ps.yourName': 'Your name',
    'ps.namePlaceholder': 'e.g. Jan Janssens',
    'ps.teams': 'Teams',
    'ps.creating': 'Creating…',
    'ps.createProfile': 'Create profile',
    'ps.enterNameError': 'Enter your name.',
    'ps.createFailed': 'Could not create profile',

    // ---- Settings ----
    'set.prefs': 'Preferences',
    'set.teamSection': 'Team',
    'set.appSection': 'App',
    'set.devSection': 'Developer',
    'set.accountSection': 'Account',
    'set.notifications': 'Notifications',
    'set.notifOffSub': 'Attendance and kickoff alerts',
    'set.notifOnSub': 'Attendance and kickoff alerts on this phone',
    'set.installFirst': 'Install Shotten to your home screen first',
    'set.updating': 'Updating…',
    'set.haptic': 'Haptic feedback',
    'set.hapticSub': 'Vibration on actions',
    'set.fullNames': 'Show full names',
    'set.fullNamesOn': 'Names visible on cards',
    'set.fullNamesOff': 'Compact attendance on cards',
    'set.pastMatches': 'Show past matches',
    'set.pastOn': 'History on the board, scrolls to next',
    'set.pastOff': 'Upcoming matches only',
    'set.forfait': 'Count forfait matches',
    'set.forfaitOn': 'Forfaits count toward attendance %',
    'set.forfaitOff': 'Forfaits left out of attendance %',
    'set.appearance': 'Appearance',
    'set.reduceMotion': 'Reduce motion',
    'set.reduceMotionOn': 'Animations and transitions minimized',
    'set.reduceMotionOff': 'Follows your system setting',
    'set.language': 'Language',
    'set.languageSub': 'App texts and date formats',
    'set.oledBlack': 'OLED Black',
    'set.oledDesc': 'Pure black for OLED displays',
    'set.white': 'White',
    'set.whiteDesc': 'Clean light theme',
    'set.mistral': 'Mistral',
    'set.mistralDesc': 'Black with warm Mistral orange',
    'set.league': 'Default league',
    'set.leagueAuto': 'Auto-select',
    'set.leagueAutoSub': 'Prefer Mechelen if available',
    'set.managePlayers': 'Manage players',
    'set.managePlayersSub': 'Add, edit or remove players',
    'set.versionHistory': 'Version history',
    'set.viewChangelog': 'View changelog and updates',
    'set.updated': 'Updated {when}',
    'set.newReleases': '{count} new release | {count} new releases',
    'set.version': 'Version {build} · {when}',
    'set.hiddenAdmin': 'Hidden admin',
    'set.hiddenAdminSub': 'Worker dashboard for private network',
    'set.dataSource': 'Data source',
    'set.mockData': 'Mock data',
    'set.liveBackend': 'Live backend',
    'set.offline': 'Offline',
    'set.connected': 'Connected',
    'set.backendStatus': 'Backend status',
    'set.player': 'Player',
    'set.new': 'New',
    'set.signedInSub': 'Signed in on this device',
    'set.signOut': 'Sign out',
    'set.signOutSub': 'Switch to a different player',

    // ---- Match page ----
    'mp.squad': 'Squad',
    'mp.opponentTab': 'Opponent',
    'mp.shareCard': 'Share match card',
    'mp.directions': 'Directions',
    'mp.addCalendar': 'Add to Calendar',
    'mp.opponentPage': 'Opponent team page',
    'mp.viewOnLzv': 'View opponent on LZV Cup',
    'mp.captain': 'Captain',
    'mp.respondFor': 'Respond for players',
    'mp.undoForfait': 'Undo forfait',
    'mp.markForfait': 'Mark as forfait',
    'mp.coming': 'Coming',
    'mp.maybe': 'Maybe',
    'mp.notComing': 'Not coming',
    'mp.noResponse': 'No response',
    'mp.present': 'Present',
    'mp.absent': 'Absent',
    'mp.forfaitNote': 'This match will not be played.',
    'mp.awayPeriod': 'Away period',
    'mp.in': 'In',
    'mp.out': 'Out',
    'mp.share': 'Share…',
    'mp.copyText': 'Copy text',
    'mp.copied': 'Copied!',
    'mp.copyFailed': 'Could not copy — try sharing instead',
    'mp.notPlayed': 'Not played yet',
};

const nl: Record<string, string> = {
    // ---- Navigatie ----
    'nav.home': 'Start',
    'nav.stats': 'Stats',
    'nav.league': 'Competitie',
    'nav.settings': 'Instellingen',

    // ---- Profielkeuze ----
    'ps.whoAreYou': 'Wie ben je?',
    'ps.selectToContinue': 'Kies je profiel om verder te gaan.',
    'ps.search': 'Spelers zoeken...',
    'ps.lastUsed': 'Laatst gekozen',
    'ps.welcome': 'Welkom, {name}',
    'ps.noPlayersFound': 'Geen spelers gevonden',
    'ps.noPlayersDesc': 'Probeer een andere zoekterm.',
    'ps.firstPlayerTitle': 'Nog geen spelers',
    'ps.firstPlayerDesc': 'Maak het eerste profiel aan om te starten.',
    'ps.yourName': 'Je naam',
    'ps.namePlaceholder': 'bv. Jan Janssens',
    'ps.teams': 'Teams',
    'ps.creating': 'Aanmaken…',
    'ps.createProfile': 'Profiel aanmaken',
    'ps.enterNameError': 'Vul je naam in.',
    'ps.createFailed': 'Aanmaken mislukt',

    // ---- Instellingen ----
    'set.prefs': 'Voorkeuren',
    'set.teamSection': 'Team',
    'set.appSection': 'App',
    'set.devSection': 'Developer',
    'set.accountSection': 'Account',
    'set.notifications': 'Notificaties',
    'set.notifOffSub': 'Aanwezigheids- en aftrapmeldingen',
    'set.notifOnSub': 'Meldingen aan op deze telefoon',
    'set.installFirst': 'Installeer Shotten eerst op je beginscherm',
    'set.updating': 'Bezig met bijwerken…',
    'set.haptic': 'Trilfeedback',
    'set.hapticSub': 'Trillen bij acties',
    'set.fullNames': 'Volledige namen tonen',
    'set.fullNamesOn': 'Namen zichtbaar op kaarten',
    'set.fullNamesOff': 'Compacte aanwezigheid op kaarten',
    'set.pastMatches': 'Afgelopen matchen tonen',
    'set.pastOn': 'Geschiedenis op het bord, scrollt naar de volgende',
    'set.pastOff': 'Alleen komende matchen',
    'set.forfait': 'Forfait-matchen meetellen',
    'set.forfaitOn': 'Forfaits tellen mee in aanwezigheid %',
    'set.forfaitOff': 'Forfaits buiten aanwezigheid %',
    'set.appearance': 'Uiterlijk',
    'set.reduceMotion': 'Minder beweging',
    'set.reduceMotionOn': 'Animaties geminimaliseerd',
    'set.reduceMotionOff': 'Volgt je systeeminstelling',
    'set.language': 'Taal',
    'set.languageSub': 'App-teksten en datumnotatie',
    'set.oledBlack': 'OLED Black',
    'set.oledDesc': 'Puur zwart voor OLED-schermen',
    'set.white': 'Wit',
    'set.whiteDesc': 'Helder licht thema',
    'set.mistral': 'Mistral',
    'set.mistralDesc': 'Zwart met warme Mistral-oranje',
    'set.league': 'Standaardcompetitie',
    'set.leagueAuto': 'Automatisch kiezen',
    'set.leagueAutoSub': 'Mechelen heeft voorkeur indien beschikbaar',
    'set.managePlayers': 'Spelers beheren',
    'set.managePlayersSub': 'Spelers toevoegen, bewerken of verwijderen',
    'set.versionHistory': 'Versiegeschiedenis',
    'set.viewChangelog': 'Bekijk changelog en updates',
    'set.updated': 'Bijgewerkt {when}',
    'set.newReleases': '{count} nieuwe release | {count} nieuwe releases',
    'set.version': 'Versie {build} · {when}',
    'set.hiddenAdmin': 'Hidden admin',
    'set.hiddenAdminSub': 'Worker-dashboard voor privénetwerk',
    'set.dataSource': 'Databron',
    'set.mockData': 'Mock-data',
    'set.liveBackend': 'Live backend',
    'set.offline': 'Offline',
    'set.connected': 'Verbonden',
    'set.backendStatus': 'Backendstatus',
    'set.player': 'Speler',
    'set.new': 'Nieuw',
    'set.signedInSub': 'Ingelogd op dit toestel',
    'set.signOut': 'Uitloggen',
    'set.signOutSub': 'Wissel naar een andere speler',

    // ---- Matchpagina ----
    'mp.squad': 'Ploeg',
    'mp.opponentTab': 'Tegenstander',
    'mp.shareCard': 'Deelbare matchkaart',
    'mp.directions': 'Routebeschrijving',
    'mp.addCalendar': 'Toevoegen aan agenda',
    'mp.opponentPage': 'Tegenstander-pagina',
    'mp.viewOnLzv': 'Tegenstander op LZV Cup',
    'mp.captain': 'Kaptein',
    'mp.respondFor': 'Antwoorden voor spelers',
    'mp.undoForfait': 'Forfait ongedaan maken',
    'mp.markForfait': 'Als forfait markeren',
    'mp.coming': 'Komt',
    'mp.maybe': 'Misschien',
    'mp.notComing': 'Komt niet',
    'mp.noResponse': 'Nog geen reactie',
    'mp.present': 'Aanwezig',
    'mp.absent': 'Afwezig',
    'mp.forfaitNote': 'Deze match wordt niet gespeeld.',
    'mp.awayPeriod': 'Afwezige periode',
    'mp.in': 'In',
    'mp.out': 'Uit',
    'mp.share': 'Delen…',
    'mp.copyText': 'Tekst kopiëren',
    'mp.copied': 'Gekopieerd!',
    'mp.copyFailed': 'Kopiëren mislukt — probeer te delen',
    'mp.notPlayed': 'Nog niet gespeeld',
};

const fr: Record<string, string> = {
    // ---- Navigation ----
    'nav.home': 'Accueil',
    'nav.stats': 'Stats',
    'nav.league': 'Compétition',
    'nav.settings': 'Réglages',

    // ---- Sélecteur de profil ----
    'ps.whoAreYou': 'Qui es-tu ?',
    'ps.selectToContinue': 'Choisis ton profil pour continuer.',
    'ps.search': 'Rechercher des joueurs...',
    'ps.lastUsed': 'Dernier utilisé',
    'ps.welcome': 'Bienvenue, {name}',
    'ps.noPlayersFound': 'Aucun joueur trouvé',
    'ps.noPlayersDesc': 'Essaie une autre recherche.',
    'ps.firstPlayerTitle': 'Pas encore de joueurs',
    'ps.firstPlayerDesc': 'Crée le premier profil pour commencer.',
    'ps.yourName': 'Ton nom',
    'ps.namePlaceholder': 'p. ex. Jean Dupont',
    'ps.teams': 'Équipes',
    'ps.creating': 'Création…',
    'ps.createProfile': 'Créer le profil',
    'ps.enterNameError': 'Entre ton nom.',
    'ps.createFailed': 'Création impossible',

    // ---- Réglages ----
    'set.prefs': 'Préférences',
    'set.teamSection': 'Équipe',
    'set.appSection': 'App',
    'set.devSection': 'Développeur',
    'set.accountSection': 'Compte',
    'set.notifications': 'Notifications',
    'set.notifOffSub': 'Alertes de présence et de coup d’envoi',
    'set.notifOnSub': 'Alertes activées sur ce téléphone',
    'set.installFirst': 'Installe d’abord Shotten sur ton écran d’accueil',
    'set.updating': 'Mise à jour…',
    'set.haptic': 'Retour haptique',
    'set.hapticSub': 'Vibration lors des actions',
    'set.fullNames': 'Afficher les noms complets',
    'set.fullNamesOn': 'Noms visibles sur les cartes',
    'set.fullNamesOff': 'Présence compacte sur les cartes',
    'set.pastMatches': 'Afficher les matchs passés',
    'set.pastOn': 'Historique sur le tableau, défile vers le suivant',
    'set.pastOff': 'Uniquement les matchs à venir',
    'set.forfait': 'Compter les matchs de forfait',
    'set.forfaitOn': 'Les forfaits comptent dans le % de présence',
    'set.forfaitOff': 'Forfaits exclus du % de présence',
    'set.appearance': 'Apparence',
    'set.reduceMotion': 'Réduire les animations',
    'set.reduceMotionOn': 'Animations et transitions minimisées',
    'set.reduceMotionOff': 'Suit le réglage de ton système',
    'set.language': 'Langue',
    'set.languageSub': 'Textes de l’app et format de date',
    'set.oledBlack': 'OLED Black',
    'set.oledDesc': 'Noir pur pour écrans OLED',
    'set.white': 'Blanc',
    'set.whiteDesc': 'Thème clair et épuré',
    'set.mistral': 'Mistral',
    'set.mistralDesc': 'Noir avec l’orange chaleureux de Mistral',
    'set.league': 'Compétition par défaut',
    'set.leagueAuto': 'Choix automatique',
    'set.leagueAutoSub': 'Préférer Malines si disponible',
    'set.managePlayers': 'Gérer les joueurs',
    'set.managePlayersSub': 'Ajouter, modifier ou supprimer des joueurs',
    'set.versionHistory': 'Historique des versions',
    'set.viewChangelog': 'Voir le changelog et les mises à jour',
    'set.updated': 'Mis à jour {when}',
    'set.newReleases': '{count} nouvelle version | {count} nouvelles versions',
    'set.version': 'Version {build} · {when}',
    'set.hiddenAdmin': 'Hidden admin',
    'set.hiddenAdminSub': 'Dashboard worker pour réseau privé',
    'set.dataSource': 'Source de données',
    'set.mockData': 'Données fictives',
    'set.liveBackend': 'Backend live',
    'set.offline': 'Hors ligne',
    'set.connected': 'Connecté',
    'set.backendStatus': 'État du backend',
    'set.player': 'Joueur',
    'set.new': 'Nouveau',
    'set.signedInSub': 'Connecté sur cet appareil',
    'set.signOut': 'Se déconnecter',
    'set.signOutSub': 'Changer de joueur',

    // ---- Page match ----
    'mp.squad': 'Équipe',
    'mp.opponentTab': 'Adversaire',
    'mp.shareCard': 'Carte de match partageable',
    'mp.directions': 'Itinéraire',
    'mp.addCalendar': 'Ajouter au calendrier',
    'mp.opponentPage': 'Page de l’équipe adverse',
    'mp.viewOnLzv': 'Voir l’adversaire sur LZV Cup',
    'mp.captain': 'Capitaine',
    'mp.respondFor': 'Répondre pour d’autres joueurs',
    'mp.undoForfait': 'Annuler le forfait',
    'mp.markForfait': 'Marquer comme forfait',
    'mp.coming': 'Vient',
    'mp.maybe': 'Peut-être',
    'mp.notComing': 'Ne vient pas',
    'mp.noResponse': 'Pas de réponse',
    'mp.present': 'Présent',
    'mp.absent': 'Absent',
    'mp.forfaitNote': 'Ce match ne sera pas joué.',
    'mp.awayPeriod': 'Période d’absence',
    'mp.in': 'Présent',
    'mp.out': 'Absent',
    'mp.share': 'Partager…',
    'mp.copyText': 'Copier le texte',
    'mp.copied': 'Copié !',
    'mp.copyFailed': 'Copie impossible — essaie de partager',
    'mp.notPlayed': 'Pas encore joué',
};

const dictionaries: Record<Language, Record<string, string>> = { en, nl, fr };

/** Translate a key for a language, substituting `{name}` placeholders. */
export function translateFor(language: Language, key: string, vars?: Record<string, string | number>): string {
    const raw = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
    );
}

/**
 * Language hook. Re-renders the caller when the preference changes and
 * provides a `t(key, vars)` helper bound to the active language.
 */
export function useLanguage() {
    const [lang, setLocal] = useState<Language>('en');

    useEffect(() => {
        setLocal(getLanguage());
        const onChange = () => setLocal(getLanguage());
        window.addEventListener(LANGUAGE_EVENT, onChange);
        return () => window.removeEventListener(LANGUAGE_EVENT, onChange);
    }, []);

    // Only the plural pair in `set.newReleases` needs a pipe split.
    const t = useCallback(
        (key: string, vars?: Record<string, string | number>) => {
            const count = vars?.count;
            const raw = translateFor(lang, key, vars);
            if (typeof count === 'number' && raw.includes('|')) {
                const parts = raw.split(/\s*\|\s*/);
                const branch = Math.abs(count) === 1 ? parts[0] : parts[parts.length - 1];
                return branch;
            }
            return raw;
        },
        [lang],
    );

    return { lang, t, changeLanguage: setLanguage };
}
