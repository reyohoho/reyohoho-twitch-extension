import formatMessage from '../../../i18n/index.js';
import settings from '../../../settings.js';
import {SettingIds} from '../../../constants.js';
import twitch from '../../../utils/twitch.js';
import commandStore, {PermissionLevels} from '../store.js';
import PastaWindow from './PastaWindow.jsx';

let pastaWindow = null;

function registerPastaCommand() {
  commandStore.registerCommand({
    name: 'pasta',
    commandArgs: [{name: 'query', isRequired: true}],
    description: formatMessage({defaultMessage: 'Usage: "/pasta query" - Search for copypastas'}),
    handler: (query) => {
      if (!query || query.trim() === '') {
        twitch.sendChatAdminMessage('Usage: /pasta <query>');
        return;
      }

      if (pastaWindow && pastaWindow.isOpen()) {
        pastaWindow.close();
      }

      pastaWindow = new PastaWindow(query.trim());
      pastaWindow.open();
    },
    permissionLevel: PermissionLevels.VIEWER,
  });
}

function unregisterPastaCommand() {
  commandStore.unregisterCommand('pasta');
}

function handleSettingChange(value) {
  if (value) {
    registerPastaCommand();
  } else {
    unregisterPastaCommand();
  }
}

if (settings.get(SettingIds.PASTA_COMMAND)) {
  registerPastaCommand();
}

settings.on(`changed.${SettingIds.PASTA_COMMAND}`, handleSettingChange);
