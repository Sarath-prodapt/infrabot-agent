"""
Monitoring and metrics collection service.
"""
import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import asyncio
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

@dataclass
class MetricsSummary:
    """Summary of system metrics."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    p95_response_time: float = 0.0
    active_connections: int = 0
    cache_hit_rate: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

class MetricsCollector:
    """Collect and analyze system metrics."""
    
    def __init__(self, max_samples: int = 1000):
        self.max_samples = max_samples
        self.response_times = deque(maxlen=max_samples)
        self.request_counts = defaultdict(int)
        self.error_counts = defaultdict(int)
        self.cache_stats = {"hits": 0, "misses": 0}
        self.active_requests = 0
        self.start_time = datetime.now()
    
    def record_request(self, endpoint: str, response_time: float, success: bool = True):
        """Record request metrics."""
        self.response_times.append(response_time)
        self.request_counts[endpoint] += 1
        
        if not success:
            self.error_counts[endpoint] += 1
    
    def record_cache_hit(self):
        """Record cache hit."""
        self.cache_stats["hits"] += 1
    
    def record_cache_miss(self):
        """Record cache miss."""
        self.cache_stats["misses"] += 1
    
    def increment_active_requests(self):
        """Increment active request counter."""
        self.active_requests += 1
    
    def decrement_active_requests(self):
        """Decrement active request counter."""
        self.active_requests = max(0, self.active_requests - 1)
    
    def get_summary(self) -> MetricsSummary:
        """Get metrics summary."""
        total_requests = sum(self.request_counts.values())
        total_errors = sum(self.error_counts.values())
        successful_requests = total_requests - total_errors
        
        avg_response_time = (
            sum(self.response_times) / len(self.response_times)
            if self.response_times else 0.0
        )
        
        # Calculate P95
        sorted_times = sorted(self.response_times)
        p95_index = int(0.95 * len(sorted_times)) if sorted_times else 0
        p95_response_time = sorted_times[p95_index] if sorted_times else 0.0
        
        # Calculate cache hit rate
        total_cache_ops = self.cache_stats["hits"] + self.cache_stats["misses"]
        cache_hit_rate = (
            self.cache_stats["hits"] / total_cache_ops
            if total_cache_ops > 0 else 0.0
        )
        
        return MetricsSummary(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=total_errors,
            average_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            active_connections=self.active_requests,
            cache_hit_rate=cache_hit_rate,
            last_updated=datetime.now()
        )
    
    def get_detailed_metrics(self) -> Dict[str, Any]:
        """Get detailed metrics breakdown."""
        summary = self.get_summary()
        uptime = datetime.now() - self.start_time
        
        return {
            "summary": summary.__dict__,
            "uptime_seconds": uptime.total_seconds(),
            "endpoint_stats": dict(self.request_counts),
            "error_stats": dict(self.error_counts),
            "cache_stats": self.cache_stats.copy(),
            "recent_response_times": list(self.response_times)[-10:],  # Last 10 response times
        }

# Global metrics collector
metrics = MetricsCollector()

def track_request_metrics(endpoint: str):
    """Decorator to track request metrics."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            metrics.increment_active_requests()
            success = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                logger.error(f"Request failed on {endpoint}: {e}")
                raise
            finally:
                response_time = time.time() - start_time
                metrics.record_request(endpoint, response_time, success)
                metrics.decrement_active_requests()
        
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            metrics.increment_active_requests()
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                logger.error(f"Request failed on {endpoint}: {e}")
                raise
            finally:
                response_time = time.time() - start_time
                metrics.record_request(endpoint, response_time, success)
                metrics.decrement_active_requests()
        
        import asyncio
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator
