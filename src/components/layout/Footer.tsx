'use client'

import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Predixa</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Professional Trading Analytics Platform
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Educational content only - NOT financial advice. Trading involves risk.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.notion.so/Predixa-Terms-of-Service-28ff89ca672480f3b8a7d4bb82346fe4?source=copy_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://www.notion.so/Predixa-Privacy-Policy-7e268254f7e149a1b0ace9572ac70e78?source=copy_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  title="Coming soon"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  title="Coming soon"
                >
                  Refund Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  title="Coming soon"
                >
                  Disclaimer
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.notion.so/Predixa-App-Support-28ef89ca67248053b3f9d19aec86068a?source=copy_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Help Center
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-500">
            © {currentYear} Predixa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}



