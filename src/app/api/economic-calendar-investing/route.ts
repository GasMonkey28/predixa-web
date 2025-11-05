import { NextResponse } from 'next/server'
import axios from 'axios'
const cheerio = require('cheerio')

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    console.log('Investing.com Economic Calendar API - fetching for date:', date)
    
    // Investing.com economic calendar URL
    const investingUrl = 'https://www.investing.com/economic-calendar/'
    
    try {
      // Fetch the economic calendar page
      const response = await axios.get(investingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://www.investing.com/'
        },
        timeout: 20000, // Increased timeout for production
        validateStatus: (status) => status < 500 // Accept 4xx responses to handle them
      })
      
      console.log('Investing.com response status:', response.status)
      console.log('Investing.com response data length:', response.data?.length || 0)
      
      // Check if we got valid HTML
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid response data from Investing.com')
      }
      
      // Parse HTML using cheerio
      const $ = cheerio.load(response.data)
      
      // Try to extract data from JavaScript/JSON embedded in the page first
      // Investing.com often embeds calendar data in JavaScript variables
      const events: any[] = []
      let jsDataFound = false
      
      // Look for JavaScript variables containing calendar data
      const scriptMatches = response.data.match(/var\s+economicCalendar\s*=\s*(\[.*?\]);/s) ||
                           response.data.match(/window\.economicCalendarData\s*=\s*(\[.*?\]);/s) ||
                           response.data.match(/economicCalendarData\s*:\s*(\[.*?\])/s) ||
                           response.data.match(/data:\s*(\[.*?\])/s)
      
      if (scriptMatches && scriptMatches[1]) {
        try {
          const jsonData = JSON.parse(scriptMatches[1])
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            console.log('Found JavaScript-embedded calendar data:', jsonData.length, 'events')
            jsDataFound = true
            jsonData.forEach((event: any, index: number) => {
              events.push({
                id: `investing-js-${index}-${Date.now()}`,
                time: event.time || event.release_time || '08:30',
                event: event.event || event.title || event.name || event.description || 'Economic Event',
                impact: event.impact || (event.importance === 'high' ? 3 : event.importance === 'medium' ? 2 : 1),
                country: event.country || event.currency === 'USD' ? 'US' : 'US',
                actual: event.actual || event.actual_value || null,
                forecast: event.forecast || event.forecast_value || null,
                previous: event.previous || event.previous_value || null
              })
            })
          }
        } catch (parseError) {
          console.log('Failed to parse JavaScript-embedded data:', parseError)
        }
      }
      
      // Log HTML structure for debugging
      console.log('HTML loaded, checking for calendar table...')
      const testSelector = $('#economicCalendarDataTable')
      console.log('Found #economicCalendarDataTable:', testSelector.length > 0)
      
      // Investing.com uses a table structure with class 'js-event-item' or similar
      // Try multiple selectors to find the events
      const eventSelectors = [
        'table.js-event-item',
        'tr[data-event-datetime]',
        'tr.eventRow',
        '.js-event-item',
        '#economicCalendarDataTable tbody tr'
      ]
      
      let foundEvents = jsDataFound // If we found JS data, we already have events
      
      // Only try HTML scraping if we didn't find JavaScript-embedded data
      if (!jsDataFound) {
        for (const selector of eventSelectors) {
          const rows = $(selector)
          if (rows.length > 0) {
            foundEvents = true
            rows.each((index: number, element: any) => {
            const $row = $(element)
            
            // Extract event data from the row
            const time = $row.find('.time').text().trim() || $row.find('[data-time]').attr('data-time') || 'TBD'
            const eventName = $row.find('.event').text().trim() || 
                            $row.find('[data-event_name]').attr('data-event_name') || 
                            $row.find('td').eq(2).text().trim() || 
                            'Economic Event'
            
            // Extract impact level (usually represented by bull icons)
            const impactIcons = $row.find('.grayFullBullishIcon, .bullishIcon').length
            let impact = 2 // Default to medium
            if (impactIcons >= 3) impact = 3
            else if (impactIcons === 2) impact = 2
            else if (impactIcons === 1) impact = 1
            
            // Extract actual, forecast, previous values
            // Try multiple methods as Investing.com structure may vary
            // Helper function to extract text from a cell, including data attributes
            const extractCellValue = (cell: any): string | null => {
              // First try data attributes
              const dataActual = cell.attr('data-actual') || cell.find('[data-actual]').attr('data-actual')
              if (dataActual && typeof dataActual === 'string' && dataActual.trim() && dataActual !== '-' && dataActual !== 'TBD' && dataActual !== 'N/A') {
                return dataActual.trim()
              }
              
              // Then try text content
              const text = cell.text().trim()
              const nested = cell.find('span, div, strong, a').first().text().trim()
              const finalText = nested || text
              
              if (finalText && finalText !== '-' && finalText !== '' && finalText !== 'TBD' && finalText !== 'N/A') {
                return finalText
              }
              
              return null
            }
            
            let actual: string | null = null
            let forecast: string | null = null
            let previous: string | null = null
            
            // Try data attributes first
            const dataActualAttr = $row.attr('data-actual') || $row.find('[data-actual]').attr('data-actual')
            actual = (dataActualAttr && typeof dataActualAttr === 'string') ? dataActualAttr : null
            
            const dataForecastAttr = $row.attr('data-forecast') || $row.find('[data-forecast]').attr('data-forecast')
            forecast = (dataForecastAttr && typeof dataForecastAttr === 'string') ? dataForecastAttr : null
            
            const dataPreviousAttr = $row.attr('data-previous') || $row.find('[data-previous]').attr('data-previous')
            previous = (dataPreviousAttr && typeof dataPreviousAttr === 'string') ? dataPreviousAttr : null
            
            // Try class-based selectors
            if (!actual) {
              const actualEl = $row.find('.actual, [class*="actual"], [id*="actual"]').first()
              actual = extractCellValue(actualEl)
            }
            
            if (!forecast) {
              const forecastEl = $row.find('.forecast, [class*="forecast"], [id*="forecast"]').first()
              forecast = extractCellValue(forecastEl)
            }
            
            if (!previous) {
              const previousEl = $row.find('.previous, [class*="previous"], [id*="previous"]').first()
              previous = extractCellValue(previousEl)
            }
            
            // If table structure, try to get values from td cells by position
            // Investing.com typically has columns in this order:
            // time | currency/flag | impact | event | actual | forecast | previous
            const tds = $row.find('td')
            
            if (tds.length >= 5) {
              // Try multiple extraction strategies
              // Strategy 1: Last 3 columns (most common for 7-8 column tables)
              // Actual is usually 3rd from last, Forecast is 2nd from last, Previous is last
              const actualIndex = tds.length - 3
              const forecastIndex = tds.length - 2
              const previousIndex = tds.length - 1
              
              // Extract actual (usually 3rd from last)
              if (!actual) {
                const actualCell = tds.eq(actualIndex)
                actual = extractCellValue(actualCell)
              }
              
              // Extract forecast (usually 2nd from last)
              if (!forecast) {
                const forecastCell = tds.eq(forecastIndex)
                forecast = extractCellValue(forecastCell)
              }
              
              // Extract previous (usually last column)
              if (!previous) {
                const previousCell = tds.eq(previousIndex)
                previous = extractCellValue(previousCell)
              }
              
              // Strategy 2: For 8-column tables, try positions 4, 5, 6 (if Strategy 1 didn't work)
              if (tds.length === 8 && (!actual || !forecast || !previous)) {
                if (!actual) {
                  actual = extractCellValue(tds.eq(4))
                }
                if (!forecast) {
                  forecast = extractCellValue(tds.eq(5))
                }
                if (!previous) {
                  previous = extractCellValue(tds.eq(6))
                }
              }
              
              // Strategy 3: Try all columns and look for patterns (actual often has special styling)
              if (!actual || !forecast || !previous) {
                tds.each((i: number, el: any) => {
                  const $td = $(el)
                  const text = $td.text().trim()
                  const hasBold = $td.find('strong, b').length > 0
                  const hasSpecialClass = $td.attr('class')?.includes('actual') || $td.attr('class')?.includes('bold')
                  
                  // Actual values are often bold or have special styling
                  if (!actual && (hasBold || hasSpecialClass) && text && text !== '-' && text.length < 20) {
                    // Check if it looks like a number/percentage
                    if (/^[\d.,+-]+[KMB%]?$/.test(text.replace(/[\s]/g, ''))) {
                      actual = text
                    }
                  }
                })
              }
            }
            
            // Clean up the values - convert empty strings to null, but preserve valid values
            if (actual === '' || actual === '-' || actual === 'TBD' || actual === 'N/A') actual = null
            if (forecast === '' || forecast === '-' || forecast === 'TBD' || forecast === 'N/A') forecast = null
            if (previous === '' || previous === '-' || previous === 'TBD' || previous === 'N/A') previous = null
            
            // Extract country - try multiple methods to identify US events
            let country = $row.find('.flagCur').text().trim() || 
                         $row.find('[data-country]').attr('data-country') || 
                         $row.find('.flag').attr('title') || 
                         $row.find('img.flag').attr('alt') || ''
            
            // Check if currency is USD (indicates US event)
            const currency = $row.find('[data-currency]').attr('data-currency') || 
                           $row.find('.currency').text().trim() || ''
            
            // If currency is USD, set country to US
            if (currency.toUpperCase() === 'USD' && !country) {
              country = 'US'
            }
            
            // Default to US if no country found (most economic calendar events are US)
            if (!country) {
              country = 'US'
            }
            
            if (eventName && eventName !== 'Economic Event') {
              // Debug logging for first few events
              if (index < 3) {
                const tds = $row.find('td')
                const columnData: any = {}
                tds.each((i: number, el: any) => {
                  columnData[`col_${i}`] = $(el).text().trim()
                })
                console.log(`Event ${index}:`, {
                  event: eventName,
                  time,
                  actual,
                  forecast,
                  previous,
                  country,
                  tdsCount: tds.length,
                  columns: columnData
                })
              }
              
              events.push({
                id: `investing-${index}-${Date.now()}`,
                time: time || '08:30',
                event: eventName,
                impact: impact,
                country: country,
                actual: actual,
                forecast: forecast,
                previous: previous
              })
            }
          })
          break // Found events, no need to try other selectors
        }
      }
    }
      
      // If no events found via scraping or JS extraction, use intelligent fallback
      if (!foundEvents || events.length === 0) {
        console.log('No events found via scraping, using intelligent fallback')
        console.log('HTML sample (first 1000 chars):', response.data?.substring(0, 1000))
        console.log('Tried selectors:', eventSelectors)
        // Try to find any table at all
        const allTables = $('table')
        console.log('Total tables found in HTML:', allTables.length)
        const allRows = $('tr')
        console.log('Total rows found in HTML:', allRows.length)
        
        // Generate realistic events based on common economic releases
        const today = new Date(date)
        const commonEvents = [
          { name: 'Consumer Price Index (CPI)', impact: 3, time: '08:30' },
          { name: 'Nonfarm Payrolls (NFP)', impact: 3, time: '08:30' },
          { name: 'Federal Reserve Interest Rate Decision', impact: 3, time: '14:00' },
          { name: 'Retail Sales', impact: 2, time: '08:30' },
          { name: 'Industrial Production', impact: 2, time: '09:15' },
          { name: 'GDP Growth Rate', impact: 3, time: '08:30' },
          { name: 'Unemployment Rate', impact: 3, time: '08:30' },
          { name: 'Producer Price Index (PPI)', impact: 2, time: '08:30' },
          { name: 'Housing Starts', impact: 2, time: '08:30' },
          { name: 'Consumer Confidence', impact: 2, time: '10:00' }
        ]
        
        commonEvents.forEach((event, index) => {
          events.push({
            id: `investing-fallback-${index}`,
            time: event.time,
            event: event.name,
            impact: event.impact,
            country: 'US',
            actual: null,
            forecast: index % 2 === 0 ? '3.1%' : '180K',
            previous: index % 2 === 0 ? '3.0%' : '175K'
          })
        })
      }
      
      // Filter to only show USA events based on country code
      const usaEvents = events.filter(event => {
        const country = (event.country || '').toUpperCase()
        return country === 'US' || country === 'USA' || country.includes('UNITED STATES') || country.startsWith('US')
      })
      
      console.log('Investing.com Economic Calendar API - parsed events:', events.length, 'USA events:', usaEvents.length)
      
      return NextResponse.json({
        events: usaEvents.slice(0, 20), // Limit to 20 events
        count: usaEvents.length,
        source: 'investing.com',
        date: date,
        isScraped: foundEvents && events.length > 0 // Flag to indicate if data was scraped or fallback
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      })
      
    } catch (fetchError: any) {
      console.error('Error fetching from investing.com:', {
        message: fetchError.message,
        code: fetchError.code,
        status: fetchError.response?.status,
        statusText: fetchError.response?.statusText,
        responseData: fetchError.response?.data?.substring?.(0, 500), // First 500 chars of response
        stack: fetchError.stack
      })
      
      // Fallback: Return structured sample data
      const fallbackEvents = [
        {
          id: 'investing-fallback-1',
          time: '08:30',
          event: 'Consumer Price Index (CPI)',
          impact: 3,
          country: 'US',
          actual: null,
          forecast: '3.1%',
          previous: '3.0%'
        },
        {
          id: 'investing-fallback-2',
          time: '10:00',
          event: 'Nonfarm Payrolls',
          impact: 3,
          country: 'US',
          actual: null,
          forecast: '180K',
          previous: '175K'
        },
        {
          id: 'investing-fallback-3',
          time: '14:00',
          event: 'Federal Reserve Interest Rate Decision',
          impact: 3,
          country: 'US',
          actual: null,
          forecast: '5.25%',
          previous: '5.25%'
        }
      ]
      
      return NextResponse.json({
        events: fallbackEvents,
        count: fallbackEvents.length,
        source: 'investing.com',
        date: date,
        note: 'Using fallback data due to fetch error',
        isScraped: false // Flag to indicate this is fallback data
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      })
    }
    
  } catch (error: any) {
    console.error('Investing.com Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Investing.com economic calendar data',
        details: error.message,
        events: [] // Return empty events array on error
      },
      { status: 500 }
    )
  }
}

