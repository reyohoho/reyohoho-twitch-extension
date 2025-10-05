import React from 'react';
import Checkbox from 'rsuite/Checkbox';
import CheckboxGroup from 'rsuite/CheckboxGroup';
import Panel from 'rsuite/Panel';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import { CategoryTypes, SettingIds, ChatFlags } from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import { hasFlag } from '../../../../../utils/flags.js';
import styles from '../../../styles/header.module.css';
import { registerComponent } from '../../Store.jsx';

const SETTING_NAME = formatMessage({ defaultMessage: 'Chat' });

function ChatModule() {
  const [chat, setChat] = useStorageState(SettingIds.CHAT);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.setting}>
        <p className={styles.settingDescription}>{formatMessage({ defaultMessage: 'Edit or modify chat features' })}</p>
        <CheckboxGroup
          value={Object.values(ChatFlags).filter((value) => hasFlag(chat, value))}
          onChange={(value) => setChat(value.reduce((a, b) => a | b, 0))}>
          <Checkbox key="chatMessageHistory" value={ChatFlags.CHAT_MESSAGE_HISTORY}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Chat Message History' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Restore what you previously typed by pressing up/down arrow in chat' })}
            </p>
          </Checkbox>
          <Checkbox key="chatReplies" value={ChatFlags.CHAT_REPLIES}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Chat Replies' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Show the reply button in chat' })}
            </p>
          </Checkbox>
          <Checkbox key="bits" value={ChatFlags.BITS}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Bits' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Show bits in the chat window' })}
            </p>
          </Checkbox>
          <Checkbox key="chatClips" value={ChatFlags.CHAT_CLIPS}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Chat Clips' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Show clip embeds in the chat window' })}
            </p>
          </Checkbox>
          <Checkbox key="viewerGreetings" value={ChatFlags.VIEWER_GREETING}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Viewer Greetings' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Show new viewer greetings in the chat window' })}
            </p>
          </Checkbox>
          <Checkbox key="subscriptionNotices" value={ChatFlags.SUB_NOTICE}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Subscription Notices' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({ defaultMessage: 'Show subs, re-subs, and gift subs notices in the chat window' })}
            </p>
          </Checkbox>
          <Checkbox key="communityHighlights" value={ChatFlags.COMMUNITY_HIGHLIGHTS}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Community Highlights' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({
                defaultMessage: 'Show alerts above chat window for hype trains, drops, pinned messages, etc.',
              })}
            </p>
          </Checkbox>
          <Checkbox key="moderatorActions" value={ChatFlags.MODERATOR_ACTIONS}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Moderator Actions' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({
                defaultMessage: 'Show system messages about moderator actions (timeouts, bans)',
              })}
            </p>
          </Checkbox>
          <Checkbox key="copyButton" value={ChatFlags.COPY_BUTTON}>
            <p className={styles.heading}>{formatMessage({ defaultMessage: 'Copy Message Button' })}</p>
            <p className={styles.settingDescription}>
              {formatMessage({
                defaultMessage: 'Show copy button on hover in chat messages',
              })}
            </p>
          </Checkbox>
        </CheckboxGroup>
      </div>
    </Panel>
  );
}

registerComponent(ChatModule, {
  settingId: SettingIds.CHAT,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['bits', 'highlights', 'community', 'chat', 'replies', 'clips', 'subs', 'subscriptions', 'moderator', 'actions', 'copy'],
});
