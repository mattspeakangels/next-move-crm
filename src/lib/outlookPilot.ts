import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';

export interface OutlookMessage {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
}

export const configuredClientId = (import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined)?.trim() || '';
const scopes = ['Mail.ReadBasic'];
let client: PublicClientApplication | undefined;
let activeClientId = '';

async function getClient(clientId?: string) {
  const id = (clientId || activeClientId).trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Inserisci un ID applicazione Microsoft valido.');
  }
  if (!client || activeClientId !== id) {
    const next = new PublicClientApplication({
      auth: { clientId: id, authority: 'https://login.microsoftonline.com/organizations', redirectUri: window.location.origin },
      cache: { cacheLocation: 'memoryStorage' },
    });
    await next.initialize();
    client = next;
    activeClientId = id;
  }
  return client;
}

export async function connectOutlook(clientId: string): Promise<AccountInfo> {
  const msal = await getClient(clientId);
  const result = await msal.loginPopup({ scopes, prompt: 'select_account' });
  if (!result.account) throw new Error('Microsoft non ha restituito un account.');
  return result.account;
}

export async function fetchOutlookMessages(account: AccountInfo): Promise<OutlookMessage[]> {
  const msal = await getClient();
  let token;
  try {
    token = await msal.acquireTokenSilent({ account, scopes });
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    token = await msal.acquireTokenPopup({ account, scopes });
  }
  const params = new URLSearchParams({ '$top': '20', '$select': 'id,subject,from,receivedDateTime', '$orderby': 'receivedDateTime desc' });
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!response.ok) throw new Error(`Microsoft Graph ha rifiutato la lettura (HTTP ${response.status}). Verifica il consenso e le policy aziendali.`);
  const data: { value?: OutlookMessage[] } = await response.json();
  return data.value ?? [];
}

export async function disconnectOutlook(account: AccountInfo): Promise<void> {
  const msal = await getClient();
  await msal.clearCache({ account });
}
