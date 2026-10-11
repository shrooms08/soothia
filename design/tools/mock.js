// A fake Phantom for the screenshot harness: connects to a fixed address and
// "signs" by filling the first signature slot. Never touches a real wallet.
window.phantom = {
  solana: {
    isPhantom: true,
    publicKey: null,
    async connect() {
      this.publicKey = { toString: () => "BCMmCN6PPN4LaZjoWLvufmCaHYZE5PEaU3hHzYqeorne" };
      return { publicKey: this.publicKey };
    },
    async disconnect() {
      this.publicKey = null;
    },
    async signTransaction(tx) {
      tx.signatures[0] = new Uint8Array(64).fill(9);
      return tx;
    },
  },
};
