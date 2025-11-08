import React, { useEffect, useState } from 'react';
import Panel from 'rsuite/Panel';
import Button from 'rsuite/Button';
import Loader from 'rsuite/Loader';
import { getCurrentUser } from '../../../utils/user.js';
import { checkSubscription, openSubscriptionPage } from '../../../utils/subscription-api.js';
import formatMessage from '../../../i18n/index.js';
import header from '../styles/header.module.css';
import styles from '../styles/subscription.module.css';

function SubscriptionStatus() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(false);
  const currentUser = getCurrentUser();

  useEffect(() => {
    async function fetchSubscription() {
      if (!currentUser || !currentUser.id) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        const result = await checkSubscription(currentUser.id);
        setSubscription(result);
        setError(result.error || false);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [currentUser]);

  const handleRefresh = async () => {
    if (!currentUser || !currentUser.id) return;
    
    setLoading(true);
    try {
      const result = await checkSubscription(currentUser.id);
      setSubscription(result);
      setError(result.error || false);
    } catch (err) {
      console.error('Failed to refresh subscription:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    openSubscriptionPage();
  };

  if (loading) {
    return (
      <Panel header={formatMessage({ defaultMessage: 'RTE Subscription' })}>
        <div className={styles.loading}>
          <Loader size="md" />
          <p>Проверка статуса подписки...</p>
        </div>
      </Panel>
    );
  }

  if (error && !subscription) {
    return (
      <Panel header={formatMessage({ defaultMessage: 'RTE Subscription' })}>
        <div className={styles.error}>
          <p className={header.description}>
            ⚠️ Не удалось подключиться к серверу подписки
          </p>
          <Button appearance="primary" onClick={handleRefresh}>
            Попробовать снова
          </Button>
        </div>
      </Panel>
    );
  }

  const hasSubscription = subscription?.has_subscription;
  const tier = subscription?.tier;
  const periodEnd = subscription?.current_period_end;

  return (
    <Panel header={formatMessage({ defaultMessage: 'RTE Subscription' })}>
      {hasSubscription ? (
        <div className={styles.activeSubscription}>
          <div className={styles.badge}>
            <span className={styles.icon}>✨</span>
            <span className={styles.tierLabel}>Tier {tier}</span>
          </div>
          <div className={styles.info}>
            <p className={header.description}>
              <strong>Статус:</strong> <span className={styles.active}>Активна</span>
            </p>
            {periodEnd && (
              <p className={header.description}>
                <strong>Действительно до:</strong> {new Date(periodEnd).toLocaleDateString()}
              </p>
            )}
            <p className={header.description}>
              <strong>Ваш Twitch ID:</strong> {currentUser?.id}
            </p>
          </div>
          <div className={styles.actions}>
            <Button appearance="default" size="sm" onClick={handleRefresh}>
              🔄 Обновить статус подписки
            </Button>
            <Button appearance="primary" size="sm" onClick={handleSubscribe}>
              Управление подпиской
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.noSubscription}>
          <p className={header.description}>
            🔒 У вас нет активной подписки
          </p>
          <p className={header.description}>
            Оформите подписку, чтобы получить доступ к расширенным возможностям и поддержать разработку!
          </p>
          <div className={styles.benefits}>
            <ul>
              <li>✓ Раскраска ника в чате(Только пользователи расширения увидят её)</li>
              <li>✓ Кастомный бейдж в чате(изображение на свой выбор)(Только пользователи расширения увидят его)</li>
            </ul>
          </div>
          <div className={styles.actions}>
            <Button appearance="primary" onClick={handleSubscribe}>
              💳 Оформить подписку
            </Button>
            <Button appearance="ghost" size="sm" onClick={handleRefresh}>
              🔄 Проверить статус подписки
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default SubscriptionStatus;




