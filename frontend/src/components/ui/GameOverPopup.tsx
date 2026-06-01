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

  const lower = message.toLowerCase();
  const isCheckmate = lower.includes('checkmate');
  const isResign = lower.includes('resign');
  const isWin = lower.includes('won');
  const isDraw = lower.includes('draw') || lower.includes('stalemate');

  const title = isCheckmate ? 'Checkmate!' : isDraw ? 'Draw!' : 'Game Over!';

  return (
    <div className={`game-over-overlay ${isVisible ? 'show' : ''}`}>
      <div className="game-over-popup">
        <div className="popup-content">
          <div className="popup-header">
            <div className="popup-icon">
              {isCheckmate && <FaCrown className="crown-icon" />}
              {isResign && <FaTrophy className="trophy-icon" />}
              {isWin && !isCheckmate && !isResign && <FaTrophy className="trophy-icon" />}
              {isDraw && <FaTrophy className="draw-icon" />}
            </div>
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          
          <div className="popup-body">
            <h2 className="popup-title">
              {title}
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
