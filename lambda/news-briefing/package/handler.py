"""
AWS Lambda function to generate Predixa SPY news briefings and store in S3

Environment variables required:
- MASSIVE_API_KEY: Massive.com API key
- OPENAI_API_KEY: OpenAI API key
- S3_BUCKET: S3 bucket name (or NEXT_PUBLIC_S3_BUCKET)
- AWS_REGION: AWS region (default: us-east-1)
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import boto3
import requests
from openai import OpenAI

# Initialize AWS clients
# AWS_REGION is automatically available in Lambda context, boto3 will use it
s3_client = boto3.client('s3')
s3_bucket = os.getenv('S3_BUCKET') or os.getenv('NEXT_PUBLIC_S3_BUCKET')

if not s3_bucket:
    raise ValueError('S3_BUCKET or NEXT_PUBLIC_S3_BUCKET environment variable is required')

# Initialize OpenAI client
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    raise ValueError('OPENAI_API_KEY environment variable is required')

openai_client = OpenAI(api_key=openai_api_key)

# Briefing modes
BRIEFING_MODES = ['pro', 'simple', 'wsb']
VALID_SENTIMENTS = ['bullish', 'bearish', 'mixed', 'neutral']


def fetch_spy_news() -> List[Dict[str, Any]]:
    """Fetch SPY news articles from Massive.com API"""
    api_key = os.getenv('MASSIVE_API_KEY')
    if not api_key:
        raise ValueError('MASSIVE_API_KEY environment variable is required')
    
    url = f'https://api.massive.com/v2/reference/news?ticker=SPY&limit=20&apiKey={api_key}'
    
    try:
        response = requests.get(url, headers={'Accept': 'application/json'}, timeout=30)
        response.raise_for_status()
        raw_data = response.json()
        
        # Handle different response structures
        articles = []
        if isinstance(raw_data, list):
            articles = raw_data
        elif isinstance(raw_data, dict):
            articles = (
                raw_data.get('results') or
                raw_data.get('data') or
                raw_data.get('items') or
                raw_data.get('news') or
                []
            )
        
        if not articles:
            print('Warning: No articles returned from API')
            return []
        
        # Normalize articles
        normalized = []
        for idx, item in enumerate(articles):
            publisher = item.get('publisher', {})
            if isinstance(publisher, str):
                publisher_name = publisher
            else:
                publisher_name = publisher.get('name', 'Unknown')
            
            normalized.append({
                'id': f"massive-{idx}-{item.get('published_utc', '')}",
                'publisherName': publisher_name,
                'title': item.get('title', ''),
                'description': item.get('description', ''),
                'publishedUtc': item.get('published_utc') or item.get('published_at', ''),
                'url': item.get('article_url') or item.get('url') or item.get('link', ''),
                'tickers': item.get('tickers') or item.get('symbols', []),
                'keywords': item.get('keywords', []),
                'sentiment': (
                    item.get('insights', [{}])[0].get('sentiment') if item.get('insights') 
                    else item.get('sentiment')
                ),
            })
        
        return normalized
    
    except Exception as e:
        print(f'Error fetching SPY news: {e}')
        raise


def generate_article_hash(articles: List[Dict[str, Any]]) -> str:
    """Generate hash from article IDs and timestamps"""
    if not articles:
        return ''
    
    # Use first 5 articles for hash
    hash_input = '|'.join([
        f"{a.get('id', '')}:{a.get('publishedUtc', '')}"
        for a in articles[:5]
    ])
    
    return hashlib.md5(hash_input.encode()).hexdigest()


def get_mode_instructions(mode: str, articles_text: str) -> str:
    """Get mode-specific prompt instructions"""
    if mode == 'simple':
        return f"""You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa, written in VERY SIMPLE language - explain like the reader is 5 years old.

STYLE REQUIREMENTS:
- Use simple, everyday words (avoid financial jargon like "ETF", "volatility", "liquidity")
- Explain complex concepts in plain language
- Keep sentences short and easy to understand
- Use analogies when helpful (e.g., "like a piggy bank for many companies")
- Be friendly and approachable

Here are today's top SPY news articles:

{articles_text}

Please generate a simple daily briefing that:
- Summarizes the key market-moving news in 3-6 short, simple bullet points (use plain language)
- Identifies 2-6 main themes using simple words (e.g., "prices going up", "jobs", "taxes")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects EXACTLY 10-15 most important articles (NOT 5). You MUST include at least 10 articles in top_articles array. Prioritize relevance and recency.

IMPORTANT:
- Use VERY SIMPLE language that anyone can understand
- Avoid financial jargon - explain everything in plain terms
- Do NOT provide explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema"""
    
    elif mode == 'wsb':
        return f"""You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa in a fun, engaging WallStreetBets-inspired style.

STYLE REQUIREMENTS:
- Use fun, energetic language with meme references and emojis (sparingly)
- Make it entertaining and engaging
- Use terms like "stocks go brrr", "diamond hands", "tendies", "stonks" (playfully)
- Add excitement and personality
- NO profanity or inappropriate language
- NO explicit financial advice
- Keep it fun but informative

Here are today's top SPY news articles:

{articles_text}

Please generate a fun daily briefing that:
- Summarizes the key market-moving news in 3-6 short, energetic bullet points (with personality and occasional emojis)
- Identifies 2-6 main themes using fun tags (e.g., "inflation 📈", "jobs 💼", "tariffs 🚫")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects EXACTLY 10-15 most important articles (NOT 5). You MUST include at least 10 articles in top_articles array. Prioritize relevance and recency.

IMPORTANT:
- Make it fun and engaging with meme culture references
- Use emojis sparingly (1-2 per bullet max)
- NO profanity or inappropriate content
- NO explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema"""
    
    else:  # pro
        return f"""You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa, a trading analytics platform.

Here are today's top SPY news articles:

{articles_text}

Please generate a concise daily briefing that:
- Summarizes the key market-moving news in 3-6 short bullet points
- Identifies 2-6 main themes (one or two words each, e.g., "inflation", "labor market", "tariffs")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects EXACTLY 10-15 most important articles (NOT 5). You MUST include at least 10 articles in top_articles array. Prioritize relevance and recency.

IMPORTANT:
- Be concise and factual
- Do NOT provide explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema

Return a JSON object with:
- daily_brief: array of 3-6 short bullet point strings
- themes: array of 2-6 one or two-word theme tags
- sentiment: one of "bullish", "bearish", "mixed", or "neutral"
- top_articles: array of EXACTLY 10-15 articles (NOT 5) with title, publisher, published_utc, and url fields. You MUST include at least 10 articles, prioritizing most relevant and recent. Do NOT limit to 5 articles."""


def get_system_message(mode: str) -> str:
    """Get system message for OpenAI based on mode"""
    base_schema = '{"daily_brief": ["bullet 1", "bullet 2"], "themes": ["theme1", "theme2"], "sentiment": "bullish|bearish|mixed|neutral", "top_articles": [{"title": "...", "publisher": "...", "published_utc": "...", "url": "..."}, ...]}'
    
    if mode == 'simple':
        return f'You are a friendly financial educator who explains market news in very simple terms that anyone can understand. Always output valid JSON matching this exact structure: {base_schema}'
    elif mode == 'wsb':
        return f'You are a fun, energetic market commentator who makes financial news entertaining with meme culture references and personality. NO profanity. Always output valid JSON matching this exact structure: {base_schema}'
    else:
        return f'You are a financial news analyst creating concise market briefings. Always output valid JSON matching this exact structure: {base_schema}'


def generate_briefing(articles: List[Dict[str, Any]], mode: str = 'pro') -> Dict[str, Any]:
    """Generate briefing using OpenAI"""
    if not articles:
        return get_fallback_briefing('No articles available')
    
    # Take top 15 articles
    top_articles = articles[:15]
    
    # Build articles text
    articles_text = '\n'.join([
        f"{idx + 1}. [{article.get('publishedUtc', '')[:19]} UTC] {article.get('publisherName', 'Unknown')} – {article.get('title', '')}"
        + (f": {article.get('description', '')}" if article.get('description') else '')
        for idx, article in enumerate(top_articles)
    ])
    
    prompt = get_mode_instructions(mode, articles_text)
    system_message = get_system_message(mode)
    
    try:
        completion = openai_client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': prompt},
            ],
            response_format={'type': 'json_object'},
            temperature=0.7,
            max_tokens=2500,  # Increased for more articles
        )
        
        content = completion.choices[0].message.content
        if not content:
            raise ValueError('OpenAI returned empty response')
        
        parsed = json.loads(content)
        
        # Validate and fix structure
        if not isinstance(parsed.get('daily_brief'), list):
            parsed['daily_brief'] = []
        if not isinstance(parsed.get('themes'), list):
            parsed['themes'] = []
        if not isinstance(parsed.get('top_articles'), list):
            parsed['top_articles'] = []
        
        # Ensure minimum items
        if len(parsed['daily_brief']) < 3:
            parsed['daily_brief'].extend([
                'Market news update' for _ in range(3 - len(parsed['daily_brief']))
            ])
        if len(parsed['themes']) < 2:
            parsed['themes'].extend(['market' for _ in range(2 - len(parsed['themes']))])
        
        # Validate sentiment
        sentiment = parsed.get('sentiment', 'neutral')
        if sentiment not in VALID_SENTIMENTS:
            parsed['sentiment'] = 'neutral'
        
        return parsed
    
    except Exception as e:
        print(f'Error generating briefing: {e}')
        return get_fallback_briefing(str(e))


def get_fallback_briefing(error_message: str) -> Dict[str, Any]:
    """Return fallback briefing when generation fails"""
    return {
        'daily_brief': [
            'Predixa Briefing is temporarily unavailable.',
            'Please check back shortly for AI-powered market insights.',
        ],
        'themes': ['market news'],
        'sentiment': 'neutral',
        'top_articles': [],
    }


def store_briefing_in_s3(
    briefing: Dict[str, Any],
    mode: str,
    articles: List[Dict[str, Any]],
    article_hash: str,
    date_str: Optional[str] = None
) -> Dict[str, str]:
    """Store briefing in S3 and return stored paths"""
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    stored_paths = {}
    
    # Create metadata
    metadata = {
        'briefing': briefing,
        'mode': mode,
        'articlesCount': len(articles),
        'articleHash': article_hash,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'date': date_str,
    }
    
    # Store latest version
    latest_key = f'briefings/spy/latest-{mode}.json'
    try:
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=latest_key,
            Body=json.dumps(metadata, ensure_ascii=False),
            ContentType='application/json',
        )
        stored_paths['latest'] = latest_key
        print(f'✅ Stored latest briefing: s3://{s3_bucket}/{latest_key}')
    except Exception as e:
        print(f'❌ Error storing latest briefing: {e}')
    
    # Store dated version
    dated_key = f'briefings/spy/{date_str}/{mode}.json'
    try:
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=dated_key,
            Body=json.dumps(metadata, ensure_ascii=False),
            ContentType='application/json',
        )
        stored_paths['dated'] = dated_key
        print(f'✅ Stored dated briefing: s3://{s3_bucket}/{dated_key}')
    except Exception as e:
        print(f'❌ Error storing dated briefing: {e}')
    
    return stored_paths


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda entry point"""
    try:
        # Get mode from event or default to all modes
        requested_modes = event.get('modes', BRIEFING_MODES)
        if isinstance(requested_modes, str):
            requested_modes = [requested_modes]
        if not isinstance(requested_modes, list):
            requested_modes = BRIEFING_MODES
        
        # Validate modes
        modes = [m for m in requested_modes if m in BRIEFING_MODES]
        if not modes:
            modes = BRIEFING_MODES
        
        print(f'Generating briefings for modes: {modes}')
        
        # Fetch news articles
        articles = fetch_spy_news()
        if not articles:
            return {
                'success': False,
                'error': 'No articles available',
            }
        
        article_hash = generate_article_hash(articles)
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        results = {}
        
        # Generate briefing for each mode
        for mode in modes:
            print(f'Generating {mode} briefing...')
            briefing = generate_briefing(articles, mode)
            
            # Store in S3
            stored_paths = store_briefing_in_s3(
                briefing, mode, articles, article_hash, date_str
            )
            
            results[mode] = {
                'briefing': briefing,
                'storedPaths': stored_paths,
                'articlesCount': len(articles),
                'articleHash': article_hash,
            }
        
        return {
            'success': True,
            'date': date_str,
            'articleHash': article_hash,
            'articlesCount': len(articles),
            'results': results,
        }
    
    except Exception as e:
        print(f'❌ Lambda error: {e}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
        }


if __name__ == '__main__':
    # Test locally
    result = lambda_handler({}, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))

