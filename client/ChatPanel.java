import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class ChatPanel extends JPanel {
    private JTextField chatField;
    private GamePanel gamePanel;

    public ChatPanel(GamePanel gamePanel) {
        this.gamePanel = gamePanel;
        setLayout(new BorderLayout());
        chatField = new JTextField();
        add(chatField, BorderLayout.CENTER);
        chatField.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                String msg = chatField.getText();
                if (!msg.trim().isEmpty()) {
                    gamePanel.setMyMessage(msg);
                    chatField.setText("");
                }
            }
        });
    }
} 