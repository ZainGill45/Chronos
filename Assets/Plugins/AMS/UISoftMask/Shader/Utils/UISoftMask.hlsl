// UISoftMask by Alexandre Soria http://sorialexandre.tech
#pragma once

#ifndef WORLDCANVAS
int _WORLDCANVAS;
#else
static int _WORLDCANVAS = 1;
#endif

float2 _RectUvSize;
float4x4 _WorldCanvasMatrix;
float4x4 _OverlayCanvasMatrix;

float2 _MaskDataSettings; // x: enabled | y: gamma2linear

/// RectUV: float4 wPos
float2 RectUV(float4 wPos)
{
    float2 rectFactor = 1.0 / _RectUvSize;
    float2 worldCanvasUV = mul(_WorldCanvasMatrix, wPos).xy * rectFactor;
    float2 overlayCanvasUV = mul(_OverlayCanvasMatrix, wPos).xy * rectFactor;
    return lerp(overlayCanvasUV, worldCanvasUV, _WORLDCANVAS);
}

/// UISoftMask: float2 rectUV, sampler2D maskSampler, float alpha
float UISoftMask(float2 rectUV, sampler2D maskSampler, float alpha)
{
    float2 uv = rectUV.xy;
    float2 trimUV = saturate((1 - max(uv, 1 - uv)) * 1000);
    float mask = tex2D(maskSampler, rectUV.xy).r * trimUV.x * trimUV.y;

    float softMaskFactor = _MaskDataSettings.x * mask;
    return alpha * (softMaskFactor + (1 - _MaskDataSettings.x));
}

/// float4 rectUV, sampler2D maskSampler
float4 DebugMask(float2 rectUV, sampler2D maskSampler)
{
    float2 uv = rectUV.xy;
    float2 trimUV = saturate((1 - max(uv, 1 - uv)) * 1000);
    return tex2D(maskSampler, uv) * trimUV.x * trimUV.y;
}
