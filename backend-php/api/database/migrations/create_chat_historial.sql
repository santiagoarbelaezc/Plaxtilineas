CREATE TABLE IF NOT EXISTS chat_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    rol ENUM('user', 'assistant') NOT NULL,
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_created (created_at)
);
