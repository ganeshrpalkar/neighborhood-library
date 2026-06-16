"""Celery application bootstrap."""

from celery import Celery
from celery.signals import after_setup_task_logger, worker_process_init
from celery.signals import setup_logging as celery_setup_logging
from kombu import Exchange, Queue

from app.core.config import settings
from app.core.logging_setup import setup_logging as configure_app_logging

celery_app = Celery("fastapi_app", include=["app.api.v1.loans.tasks"])

default_exchange = Exchange("default", type="direct")
celery_app.conf.task_queues = (Queue("default", default_exchange, routing_key="default"),)
celery_app.conf.task_default_queue = "default"
celery_app.conf.task_default_routing_key = "default"

celery_app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    accept_content=["application/json"],
    task_serializer="json",
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_ignore_result=False,
    broker_pool_limit=None,
    task_soft_time_limit=settings.CELERYD_TASK_SOFT_TIME_LIMIT,
    result_extended=True,
)

# Periodic schedule: flag overdue loans / recompute fines once a day.
celery_app.conf.beat_schedule = {
    "flag-overdue-loans-daily": {
        "task": "loans.flag_overdue_loans",
        "schedule": 24 * 60 * 60,  # seconds
    },
}


@worker_process_init.connect
def init_worker_process(**kwargs):
    from app.core.database.postgres import startup_postgres

    startup_postgres()


@celery_setup_logging.connect
def config_loggers(*args, **kwargs):
    configure_app_logging()


@after_setup_task_logger.connect
def setup_celery_task_logger(logger, **kwargs):
    logger.propagate = True


celery_app.autodiscover_tasks(["app.api.v1.items"])


@celery_app.task(bind=True)
def debug_task(self):
    return "Celery worker is healthy"
