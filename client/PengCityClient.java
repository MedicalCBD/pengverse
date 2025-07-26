import javax.swing.*;
import java.awt.*;

public class PengCityClient {
    public static void main(String[] args) {
        JFrame frame = new JFrame("PengCity");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(800, 450);
        frame.setLayout(new BorderLayout());

        GamePanel gamePanel = new GamePanel();
        ChatPanel chatPanel = new ChatPanel(gamePanel);

        frame.add(gamePanel, BorderLayout.CENTER);
        frame.add(chatPanel, BorderLayout.SOUTH);

        frame.setVisible(true);
        gamePanel.requestFocusInWindow();
    }
} 