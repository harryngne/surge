$done({
    url: $request.url.replace(/([?&])hl=[^&]+/, '$1hl=en').replace(/([?&])gl=[^&]+/, '$1gl=KR')
  });