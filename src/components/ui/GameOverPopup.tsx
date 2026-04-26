import { useEffect, useState } from 'react';
import { FaCrown, FaTrophy, FaRedo, FaTimes } from 'react-icons/fa';

interface GameOverPopupProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onNewGame?: () => void;
}

const GameOverPopup = ({ isOpen, message, onClose, onNewGame }: GameOverPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log("GameOverPopup isOpen:", isOpen, "message:", message);
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, message]);

  if (!isOpen) {
    console.log("GameOverPopup not rendering - isOpen is false");
    return null;
  }
  
  console.log("GameOverPopup rendering with message:", message);

  const isCheckmate = message.toLowerCase().includes('checkmate');
  const isWin = message.toLowerCase().includes('won');
  const isDraw = message.toLowerCase().includes('draw') || message.toLowerCase().includes('stalemate');

  return (
    <div className={`game-over-overlay ${isVisible ? 'show' : ''}`}>
      <div className="game-over-popup">
        <div className="popup-content">
          <div className="popup-header">
            <div className="popup-icon">
              {isCheckmate && <FaCrown className="crown-icon" />}
              {isWin && !isCheckmate && <FaTrophy className="trophy-icon" />}
              {isDraw && <FaTrophy className="draw-icon" />}
            </div>
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          
          <div className="popup-body">
            <h2 className="popup-title">
              {isCheckmate ? 'Checkmate!' : isWin ? 'Game Over!' : 'Draw!'}
            </h2>
            <p className="popup-message">{message}</p>
          </div>
          
          <div className="popup-actions">
            {onNewGame && (
              <button className="new-game-button" onClick={onNewGame}>
                <FaRedo className="button-icon" />
                New Game
              </button>
            )}
            <button className="close-popup-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameOverPopup;
