import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.HashMap;
import java.util.Map;

public class GamePanel extends JPanel implements KeyListener {
    // Simulación de varios pingüinos: id -> posición y mensaje
    private Map<Integer, Penguin> penguins = new HashMap<>();
    private int myId = 1; // ID del jugador local
    private int speed = 10;
    private Image background;
    private Image penguinImg;

    public GamePanel() {
        // Carga imágenes (puedes cambiar las rutas luego)
        background = new ImageIcon("client/assets/backgrounds/bg1.png").getImage();
        penguinImg = new ImageIcon("client/assets/penguins/penguin1.png").getImage();

        // Inicializa algunos pingüinos de ejemplo
        penguins.put(1, new Penguin(400, 300, "")); // Tú
        penguins.put(2, new Penguin(200, 300, "Hola!"));
        penguins.put(3, new Penguin(600, 300, "¿Qué tal?"));

        setFocusable(true);
        addKeyListener(this);
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        // Fondo
        g.drawImage(background, 0, 0, getWidth(), getHeight(), this);
        // Pingüinos y bocadillos
        for (Map.Entry<Integer, Penguin> entry : penguins.entrySet()) {
            Penguin p = entry.getValue();
            g.drawImage(penguinImg, p.x, p.y, 64, 64, this);
            if (!p.message.isEmpty()) {
                drawSpeechBubble(g, p.x + 32, p.y - 10, p.message);
            }
        }
    }

    private void drawSpeechBubble(Graphics g, int x, int y, String text) {
        FontMetrics fm = g.getFontMetrics();
        int width = fm.stringWidth(text) + 20;
        int height = 30;
        g.setColor(new Color(255,255,255,230));
        g.fillRoundRect(x - width/2, y - height, width, height, 15, 15);
        g.setColor(Color.BLACK);
        g.drawRoundRect(x - width/2, y - height, width, height, 15, 15);
        g.drawString(text, x - width/2 + 10, y - height/2 + 5);
    }

    // Movimiento local
    @Override
    public void keyPressed(KeyEvent e) {
        Penguin me = penguins.get(myId);
        int key = e.getKeyCode();
        if (key == KeyEvent.VK_LEFT) {
            me.x -= speed;
        } else if (key == KeyEvent.VK_RIGHT) {
            me.x += speed;
        }
        // Detecta si sale por el borde
        if (me.x < 0) {
            System.out.println("¡Cambiar a instancia izquierda!");
            me.x = getWidth() - 64;
        } else if (me.x > getWidth() - 64) {
            System.out.println("¡Cambiar a instancia derecha!");
            me.x = 0;
        }
        repaint();
    }
    @Override public void keyReleased(KeyEvent e) {}
    @Override public void keyTyped(KeyEvent e) {}

    // Para que el chat pueda actualizar el mensaje del jugador local
    public void setMyMessage(String msg) {
        Penguin me = penguins.get(myId);
        me.message = msg;
        repaint();
    }

    // Clase interna para pingüinos
    static class Penguin {
        int x, y;
        String message;
        Penguin(int x, int y, String message) {
            this.x = x;
            this.y = y;
            this.message = message;
        }
    }
} 