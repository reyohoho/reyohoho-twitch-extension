import React, {useState, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import twitch from '../../../utils/twitch.js';
import emotes from '../../emotes/index.js';
import {getCurrentUser} from '../../../utils/user.js';
import {getStaregeApiUrl} from '../../../utils/starege-domain.js';
import styles from './pasta.module.css';

const parseEmotesInText = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const user = getCurrentUser();
  const parts = text.split(' ');
  const elements = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const emote = emotes.getEligibleEmote(part, user);
    
    if (emote) {
      const emoteElement = emote.render();
      elements.push(
        <span 
          key={`emote-${i}`}
          dangerouslySetInnerHTML={{ __html: emoteElement.outerHTML }}
        />
      );
    } else {
      elements.push(<span key={`text-${i}`}>{part}</span>);
    }
    
    if (i < parts.length - 1) {
      elements.push(<span key={`space-${i}`}> </span>);
    }
  }

  return elements;
};

const PastaModal = ({query, onClose}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const searchPastas = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const apiUrl = getStaregeApiUrl('/api/pastas');
        if (!apiUrl) {
          throw new Error('No working Starege domain available');
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            limit: 10,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let results = [];
        if (Array.isArray(data)) {
          results = data;
        } else if (data.pastas && Array.isArray(data.pastas)) {
          results = data.pastas;
        } else if (data.results && Array.isArray(data.results)) {
          results = data.results;
        } else if (data.data && Array.isArray(data.data)) {
          results = data.data;
        }
        setResults(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    searchPastas();
  }, [query]);

  const handlePastaClick = (pasta) => {
    const currentMessage = twitch.getChatInputValue();
    const prefixText = currentMessage.length > 0 && !currentMessage.endsWith(' ') ? currentMessage + ' ' : currentMessage;
    const pastaText = typeof pasta === 'object' ? (pasta.text || pasta.content) : pasta;
    twitch.setChatInputValue(prefixText + pastaText);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <h2>Pasta Search: "{query}"</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading...</div>}
          
          {error && (
            <div className={styles.error}>
              Error: {error}
            </div>
          )}
          
          {!loading && !error && results.length === 0 && (
            <div className={styles.noResults}>
              No copypastas found for "{query}"
            </div>
          )}
          
          {!loading && !error && results.length > 0 && (
            <div className={styles.results}>
              {results.map((pasta, index) => (
                <div 
                  key={index} 
                  className={styles.pastaItem}
                  onClick={() => handlePastaClick(pasta)}
                >
                  <div className={styles.pastaText}>
                    {parseEmotesInText(pasta.text || pasta.content || pasta)}
                  </div>
                  {pasta.author && (
                    <div className={styles.pastaAuthor}>
                      by {pasta.author}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default class PastaWindow {
  constructor(query) {
    this.query = query;
    this.container = null;
    this.root = null;
    this.isOpenFlag = false;
  }

  open() {
    if (this.isOpenFlag) return;

    this.container = document.createElement('div');
    this.container.id = 'pasta-window-container';
    document.body.appendChild(this.container);

    this.root = createRoot(this.container);
    this.root.render(<PastaModal query={this.query} onClose={() => this.close()} />);
    
    this.isOpenFlag = true;
  }

  close() {
    if (!this.isOpenFlag) return;

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }

    this.isOpenFlag = false;
  }

  isOpen() {
    return this.isOpenFlag;
  }
} 