import json
import time
from unittest.mock import patch, MagicMock
from uniflow import UnifowClient, TrackOptions, IdentifyOptions


def make_client(**kwargs):
    return UnifowClient(write_key="test_key", flush_interval=9999, **kwargs)


def test_track_enqueues_event():
    client = make_client()
    client.track(TrackOptions(event="Button Clicked", user_id="u1"))
    assert len(client._queue) == 1
    assert client._queue[0]["type"] == "track"
    assert client._queue[0]["event"] == "Button Clicked"
    client.shutdown()


def test_identify_enqueues_event():
    client = make_client()
    client.identify(IdentifyOptions(user_id="u1", traits={"email": "a@b.com"}))
    assert client._queue[0]["type"] == "identify"
    assert client._queue[0]["traits"]["email"] == "a@b.com"
    client.shutdown()


def test_flush_sends_batch():
    with patch("uniflow.client.urlopen") as mock_open:
        mock_resp = MagicMock()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.status = 200
        mock_open.return_value = mock_resp

        client = make_client()
        client.track(TrackOptions(event="Test", user_id="u1"))
        client.flush()

        assert mock_open.called
        call_args = mock_open.call_args[0][0]
        body = json.loads(call_args.data.decode())
        assert len(body["batch"]) == 1
        assert body["batch"][0]["event"] == "Test"
        client.shutdown()


def test_none_values_stripped():
    client = make_client()
    client.track(TrackOptions(event="E", user_id="u1", properties=None))
    assert "properties" not in client._queue[0]
    client.shutdown()
