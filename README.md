# Key Cipher Chat - BB84 Quantum Key Distribution

A web application that simulates the BB84 Quantum Key Distribution protocol between two peers, enabling secure key exchange and encrypted chat communication.

## 🔐 Features

- **Room-based Sessions**: Create or join secure rooms with passcode authentication
- **WebRTC P2P**: Direct peer-to-peer connection with authenticated classical channel
- **Role Selection**: Choose between Alice (sender) or Bob (receiver)
- **BB84 Protocol**: Complete implementation with all steps:
  - Quantum state preparation and measurement
  - Basis sifting
  - QBER (Quantum Bit Error Rate) estimation
  - Error correction
  - Privacy amplification
- **Quantum Backends**: Choose between Qiskit-style or PennyLane-style simulation
- **Eavesdropper Mode**: Simulate Eve's intercept-measure-resend attack
- **Encrypted Chat**: 2-minute time-boxed chat using the derived quantum key

## 📖 Documentation

See [BB84_IMPLEMENTATION.md](./BB84_IMPLEMENTATION.md) for detailed protocol documentation.

## 🚀 Quick Start

### Running the Application

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: Navigate to `http://localhost:8080`

### Using the Protocol

1. **Create a Room** (Peer 1 - Alice):
   - Click "Create Room"
   - Set a passcode
   - Copy the invitation offer
   - Send to Peer 2

2. **Join the Room** (Peer 2 - Bob):
   - Click "Join Room"
   - Enter Room ID and passcode
   - Paste the invitation offer
   - Click "Generate Answer"
   - Copy the answer and send back to Peer 1

3. **Complete Connection** (Peer 1):
   - Paste the answer from Peer 2
   - Click "Complete Connection"

4. **Select Roles**:
   - Each peer selects Alice or Bob (must be different)

5. **Run BB84 Protocol**:
   - **Alice**: Click "Prepare & Send Qubits"
   - **Bob**: Click "Measure Qubits"
   - **Both**: Click "Sifting" to exchange bases
   - **Alice**: Click "QBER Check" to estimate error rate
   - **Both**: Click "Error Correction" to synchronize keys
   - **Both**: Click "Privacy Amplification" to compress key
   - Keys are verified automatically

6. **Secure Chat**:
   - Chat opens automatically after successful key exchange
   - 2-minute time limit
   - All messages encrypted with quantum-derived key

### Testing Eavesdropper Detection

1. Enable "Enable Eve" toggle before starting protocol
2. Follow normal protocol steps
3. QBER will be elevated (~25%)
4. Protocol will abort with "QBER too high" error

## Project info

**URL**: https://lovable.dev/projects/67fed449-7f16-42fd-bff1-c23762361d18

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/67fed449-7f16-42fd-bff1-c23762361d18) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/67fed449-7f16-42fd-bff1-c23762361d18) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
