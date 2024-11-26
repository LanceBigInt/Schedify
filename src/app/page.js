// Update page.js
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.functionDiv}>
          <h2 className={styles.title}>Insert PDF File</h2>
          <div className={styles.pdfPlaceholder}>
          </div>
          <div className={styles.insertPDFDiv}>
            <input type="file" accept="application/pdf" className={styles.PDFInput} />
          </div>
          <button className={styles.generateButton}>Generate Schedule</button>
        </div>
      </main>
    </div>
  );
}