import * as faSearch from '@fortawesome/free-solid-svg-icons/faSearch';
import * as faCheck from '@fortawesome/free-solid-svg-icons/faCheck';
import * as faTimes from '@fortawesome/free-solid-svg-icons/faTimes';
import {Icon} from '@rsuite/icons';
import React, {useState, useEffect, useRef} from 'react';
import Button from 'rsuite/Button';
import ButtonGroup from 'rsuite/ButtonGroup';
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
  const [currentPaint, setCurrentPaint] = useState(null);
  const [settingPaintId, setSettingPaintId] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(['LINEAR_GRADIENT', 'RADIAL_GRADIENT', 'URL']);
  const currentUser = getCurrentUser();
  const currentPaintPreviewRef = useRef(null);

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
            const paint = allPaints.find((p) => p.id === userPaintData.paint_id);
            setCurrentPaint(paint || null);
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

  useEffect(() => {
    if (currentPaintPreviewRef.current && currentPaint) {
      const className = `seventv-paint-current-preview-${currentPaint.id}`;
      currentPaintPreviewRef.current.className = `${styles.currentPaintPreviewText} ${className}`;

      const css = seventvCosmetics.generatePaintCSS(currentPaint, className);
      let styleElement = document.querySelector(`style[data-paint-preview-id="current-${currentPaint.id}"]`);

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-paint-preview-id', `current-${currentPaint.id}`);
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
      }
    }
  }, [currentPaint]);

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
        const paint = paints.find((p) => p.id === paintId);
        setCurrentPaint(paint || null);
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
        setCurrentPaint(null);
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

            {currentPaint && (
              <div className={styles.currentPaintPreview}>
                <div className={styles.currentPaintHeader}>
                  <p className={styles.currentPaintTitle}>
                    {formatMessage({defaultMessage: 'Current Paint'})}
                  </p>
                  <Button
                    appearance="ghost"
                    color="red"
                    size="xs"
                    onClick={handleRemovePaint}
                    loading={isRemoving}
                    disabled={isRemoving}>
                    <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faTimes} />{' '}
                    {formatMessage({defaultMessage: 'Remove'})}
                  </Button>
                </div>
                <div className={styles.currentPaintContent}>
                  <div ref={currentPaintPreviewRef} className={styles.currentPaintPreviewText}>
                    {currentUser?.displayName || currentUser?.username || 'Username'}
                  </div>
                  <div className={styles.currentPaintDetails}>
                    <p className={styles.currentPaintName}>{currentPaint.name}</p>
                    <p className={styles.currentPaintMeta}>
                      ID: {currentPaint.id} • {' '}
                      {currentPaint.function === 'LINEAR_GRADIENT' && 'Linear Gradient'}
                      {currentPaint.function === 'RADIAL_GRADIENT' && 'Radial Gradient'}
                      {currentPaint.function === 'URL' && 'Image'}
                    </p>
                  </div>
                </div>
              </div>
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
                <ButtonGroup className={styles.filterButtons}>
                  <Button
                    appearance={selectedTypes.includes('LINEAR_GRADIENT') ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => {
                      setSelectedTypes(prev => 
                        prev.includes('LINEAR_GRADIENT') 
                          ? prev.filter(t => t !== 'LINEAR_GRADIENT')
                          : [...prev, 'LINEAR_GRADIENT']
                      );
                    }}>
                    {formatMessage({defaultMessage: 'Linear Gradient'})}
                  </Button>
                  <Button
                    appearance={selectedTypes.includes('RADIAL_GRADIENT') ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => {
                      setSelectedTypes(prev => 
                        prev.includes('RADIAL_GRADIENT') 
                          ? prev.filter(t => t !== 'RADIAL_GRADIENT')
                          : [...prev, 'RADIAL_GRADIENT']
                      );
                    }}>
                    {formatMessage({defaultMessage: 'Radial Gradient'})}
                  </Button>
                  <Button
                    appearance={selectedTypes.includes('URL') ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => {
                      setSelectedTypes(prev => 
                        prev.includes('URL') 
                          ? prev.filter(t => t !== 'URL')
                          : [...prev, 'URL']
                      );
                    }}>
                    {formatMessage({defaultMessage: 'Image'})}
                  </Button>
                </ButtonGroup>
              </div>

              <div className={styles.statsContainer}>
                <p className={header.description}>
                  {formatMessage(
                    {defaultMessage: 'Showing {count} of {total} paints'},
                    {count: filteredPaints.length, total: paints.length}
                  )}
                </p>
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

