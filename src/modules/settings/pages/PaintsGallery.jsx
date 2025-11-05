import * as faSearch from '@fortawesome/free-solid-svg-icons/faSearch';
import * as faCheck from '@fortawesome/free-solid-svg-icons/faCheck';
import * as faTimes from '@fortawesome/free-solid-svg-icons/faTimes';
import {Icon} from '@rsuite/icons';
import React, {useState, useEffect, useRef} from 'react';
import Button from 'rsuite/Button';
import Checkbox from 'rsuite/Checkbox';
import CheckboxGroup from 'rsuite/CheckboxGroup';
import Input from 'rsuite/Input';
import InputGroup from 'rsuite/InputGroup';
import Loader from 'rsuite/Loader';
import Message from 'rsuite/Message';
import Panel from 'rsuite/Panel';
import PanelGroup from 'rsuite/PanelGroup';
import FontAwesomeSvgIcon from '../../../common/components/FontAwesomeSvgIcon.jsx';
import formatMessage from '../../../i18n/index.js';
import {getCurrentUser} from '../../../utils/user.js';
import seventvCosmetics from '../../seventv/cosmetics.js';
import {getUserPaint, setUserPaint, deleteUserPaint, checkSubscription, openSubscriptionPage} from '../../../utils/subscription-api.js';
import CloseButton from '../components/CloseButton.jsx';
import header from '../styles/header.module.css';
import styles from '../styles/paints-gallery.module.css';

function PaintPreview({paint, isActive, onSetPaint, isSettingPaint, username}) {
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current && paint) {
      const className = `seventv-paint-preview-${paint.id}`;
      previewRef.current.className = `${styles.paintPreview} ${className}`;

      const css = seventvCosmetics.generatePaintCSS(paint, className);
      let styleElement = document.querySelector(`style[data-paint-preview-id="${paint.id}"]`);

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-paint-preview-id', paint.id);
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
      }
    }
  }, [paint]);

  return (
    <div className={`${styles.paintCard} ${isActive ? styles.activePaintCard : ''}`}>
      <div className={styles.paintPreviewContainer}>
        <div ref={previewRef} className={styles.paintPreview}>
          {username}
        </div>
      </div>
      <div className={styles.paintInfo}>
        <p className={styles.paintName}>{paint.name}</p>
        <p className={styles.paintId}>ID: {paint.id}</p>
        <p className={styles.paintType}>
          {paint.function === 'LINEAR_GRADIENT' && 'Linear Gradient'}
          {paint.function === 'RADIAL_GRADIENT' && 'Radial Gradient'}
          {paint.function === 'URL' && 'Image'}
        </p>
        <Button
          appearance={isActive ? 'primary' : 'default'}
          size="sm"
          className={styles.setPaintButton}
          onClick={() => onSetPaint(paint.id)}
          disabled={isSettingPaint || isActive}
          loading={isSettingPaint}>
          {isActive ? (
            <>
              <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faCheck} />{' '}
              {formatMessage({defaultMessage: 'Active'})}
            </>
          ) : (
            formatMessage({defaultMessage: 'Set as Paint'})
          )}
        </Button>
      </div>
    </div>
  );
}

function PaintsGallery({onClose}) {
  const [paints, setPaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [currentPaintId, setCurrentPaintId] = useState(null);
  const [settingPaintId, setSettingPaintId] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(['LINEAR_GRADIENT', 'RADIAL_GRADIENT', 'URL']);
  const currentUser = getCurrentUser();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        const allPaints = await seventvCosmetics.fetchAllPaints();
        setPaints(allPaints);
        
        if (currentUser?.id) {
          const userPaintData = await getUserPaint(currentUser.id, true);
          if (userPaintData.has_paint && userPaintData.paint_id) {
            setCurrentPaintId(userPaintData.paint_id);
          }
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load paints');
        console.error('Failed to load 7TV paints:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      const styleElements = document.querySelectorAll('style[data-paint-preview-id]');
      styleElements.forEach((el) => el.remove());
    };
  }, [currentUser?.id]);

  const handleSetPaint = async (paintId) => {
    if (!currentUser?.id) {
      setMessage({type: 'error', text: formatMessage({defaultMessage: 'Please log in to set a paint'})});
      return;
    }

    try {
      const subscriptionStatus = await checkSubscription(currentUser.id);
      
      if (!subscriptionStatus.has_subscription) {
        setMessage({
          type: 'warning', 
          text: formatMessage({defaultMessage: 'Subscription required! Redirecting to subscription page...'})
        });
        
        setTimeout(() => {
          openSubscriptionPage();
        }, 2000);
        
        return;
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setMessage({
        type: 'warning', 
        text: formatMessage({defaultMessage: 'Could not verify subscription. Opening subscription page...'})
      });
      
      setTimeout(() => {
        openSubscriptionPage();
      }, 2000);
      
      return;
    }

    try {
      setSettingPaintId(paintId);
      const result = await setUserPaint(currentUser.id, paintId);
      
      if (result.success) {
        setCurrentPaintId(paintId);
        setMessage({
          type: 'success',
          text: formatMessage({defaultMessage: 'Paint set successfully! Updating...'}),
        });
        
        await seventvCosmetics.refreshAllUserPaints();
        
        setMessage({
          type: 'success',
          text: formatMessage({defaultMessage: 'Paint updated successfully!'}),
        });
      } else {
        if (result.error) {
          setMessage({
            type: 'warning', 
            text: formatMessage({defaultMessage: 'Subscription required! Opening subscription page...'})
          });
          
          setTimeout(() => {
            openSubscriptionPage();
          }, 2000);
        } else {
          setMessage({type: 'error', text: formatMessage({defaultMessage: 'Failed to set paint'})});
        }
      }
    } catch (err) {
      console.error('Failed to set paint:', err);
      setMessage({type: 'error', text: formatMessage({defaultMessage: 'Error setting paint'})});
    } finally {
      setSettingPaintId(null);
    }
  };

  const handleRemovePaint = async () => {
    if (!currentUser?.id) {
      setMessage({type: 'error', text: formatMessage({defaultMessage: 'Please log in to remove paint'})});
      return;
    }

    if (!currentPaintId) {
      setMessage({type: 'warning', text: formatMessage({defaultMessage: 'No paint to remove'})});
      return;
    }

    try {
      setIsRemoving(true);
      const result = await deleteUserPaint(currentUser.id);
      
      if (result.success) {
        setCurrentPaintId(null);
        setMessage({
          type: 'success',
          text: formatMessage({defaultMessage: 'Paint removed successfully! Updating...'}),
        });
        
        await seventvCosmetics.refreshAllUserPaints();
        
        setMessage({
          type: 'success',
          text: formatMessage({defaultMessage: 'Paint removed successfully!'}),
        });
      } else {
        setMessage({type: 'error', text: formatMessage({defaultMessage: 'Failed to remove paint'})});
      }
    } catch (err) {
      console.error('Failed to remove paint:', err);
      setMessage({type: 'error', text: formatMessage({defaultMessage: 'Error removing paint'})});
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredPaints = paints.filter((paint) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      paint.name.toLowerCase().includes(search) ||
      paint.id.toLowerCase().includes(search);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(paint.function);
    return matchesSearch && matchesType;
  });

  return (
    <>
      <div className={header.content}>
        <PanelGroup>
          <Panel header={formatMessage({defaultMessage: 'Paints Gallery'})}>
            {message && (
              <Message
                showIcon
                type={message.type}
                closable
                onClose={() => setMessage(null)}
                className={styles.message}>
                {message.text}
              </Message>
            )}

            <div className={styles.searchContainer}>
              <InputGroup inside>
                <Input
                  placeholder={formatMessage({defaultMessage: 'Search by name or ID...'})}
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                <InputGroup.Addon>
                  <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faSearch} />
                </InputGroup.Addon>
              </InputGroup>
              
              <div className={styles.filtersContainer}>
                <p className={styles.filterLabel}>
                  {formatMessage({defaultMessage: 'Type:'})}
                </p>
                <CheckboxGroup 
                  inline 
                  value={selectedTypes} 
                  onChange={setSelectedTypes}
                  className={styles.checkboxGroup}>
                  <Checkbox value="LINEAR_GRADIENT">
                    {formatMessage({defaultMessage: 'Linear Gradient'})}
                  </Checkbox>
                  <Checkbox value="RADIAL_GRADIENT">
                    {formatMessage({defaultMessage: 'Radial Gradient'})}
                  </Checkbox>
                  <Checkbox value="URL">
                    {formatMessage({defaultMessage: 'Image'})}
                  </Checkbox>
                </CheckboxGroup>
              </div>

              <div className={styles.statsContainer}>
                <p className={header.description}>
                  {formatMessage(
                    {defaultMessage: 'Showing {count} of {total} paints'},
                    {count: filteredPaints.length, total: paints.length}
                  )}
                </p>
                {currentPaintId && (
                  <div className={styles.currentPaintContainer}>
                    <p className={header.description}>
                      {formatMessage({defaultMessage: 'Current paint: {id}'}, {id: currentPaintId})}
                    </p>
                    <Button
                      appearance="ghost"
                      color="red"
                      size="xs"
                      onClick={handleRemovePaint}
                      loading={isRemoving}
                      disabled={isRemoving}
                      className={styles.removePaintButton}>
                      <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faTimes} />{' '}
                      {formatMessage({defaultMessage: 'Remove Paint'})}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <div className={styles.loaderContainer}>
                <Loader size="lg" content={formatMessage({defaultMessage: 'Loading paints...'})} />
              </div>
            )}

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.errorText}>{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className={styles.paintsGrid}>
                {filteredPaints.map((paint) => (
                  <PaintPreview
                    key={paint.id}
                    paint={paint}
                    isActive={paint.id === currentPaintId}
                    onSetPaint={handleSetPaint}
                    isSettingPaint={settingPaintId === paint.id}
                    username={currentUser?.displayName || currentUser?.username || 'Username'}
                  />
                ))}
              </div>
            )}

            {!loading && !error && filteredPaints.length === 0 && (
              <div className={styles.emptyContainer}>
                <p className={header.description}>
                  {formatMessage({defaultMessage: 'No paints found matching your search.'})}
                </p>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
      <div className={header.header}>
        <CloseButton onClose={onClose} className={header.closeButton} />
      </div>
    </>
  );
}

export default PaintsGallery;

