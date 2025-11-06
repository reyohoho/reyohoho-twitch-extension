const STAREGE_DOMAINS = [
  'https://starege.rhhhhhhh.live',
  'https://starege5.rhhhhhhh.live',
  'https://starege3.rhhhhhhh.live',
  'https://starege4.rhhhhhhh.live',
];

let workingDomain = null;
let initPromise = null;

async function checkDomainAvailability(domain) {
  try {
    const testUrl = `${domain}/https://google.com`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function initializeStaregeDomain(force = false) {
  if (initPromise && !force) return initPromise;

  if (force) {
    initPromise = null;
    workingDomain = null;
  }

  initPromise = (async () => {
    for (const domain of STAREGE_DOMAINS) {
      const isAvailable = await checkDomainAvailability(domain);
      if (isAvailable) {
        workingDomain = domain;
        console.log(`BTTV: Using Starege domain: ${domain}`);
        return domain;
      }
    }

    console.warn('BTTV: All Starege domains are unavailable');
    workingDomain = null;
    return null;
  })();

  return initPromise;
}

export function getStaregeDomain() {
  return workingDomain;
}

export function getStaregeApiUrl(path = '') {
  const domain = getStaregeDomain();
  if (!domain) return null;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${cleanPath}`;
}

