import React from 'react'
import { footerStyles } from '../assets/Styles.js'

const Footer = () => {
  return (
    <footer className={footerStyles.footer}>
        <div className={footerStyles.container}>
            <div className={footerStyles.copyright}>
                &copy; {new Date(). getFullYear()} InviceAI • Built by Salo Corporation


            </div>

            <div className={footerStyles.links}>
                <a href="/terms" className={footerStyles.link}> Terms</a>
                <a href="/privacy" className={footerStyles.link}> Privacy</a>

            </div>

        </div>

    </footer>
  )
}

export default Footer