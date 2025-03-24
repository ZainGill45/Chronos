using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace AMS.UI.SoftMask
{
    using static UISoftMaskUtils;

    [ExecuteAlways, RequireComponent(typeof(RectTransform))]
    public class RectUV : MonoBehaviour
    {
        private Canvas m_Canvas;

        protected Canvas canvas => m_Canvas
            ? m_Canvas
            : m_Canvas =
                rectTransform && rectTransform.GetComponentsInParent<Canvas>() is { Length: > 0 } canvasArray
                    ? canvasArray.First()
                    : null;

        private RectTransform m_CanvasTransform;

        private RectTransform canvasTransform =>
            m_CanvasTransform ? m_CanvasTransform :
            canvas is { } foundCanvas ? m_CanvasTransform = (RectTransform)foundCanvas.transform : null;

        private RectTransform m_RectTransform;

        protected RectTransform rectTransform => m_RectTransform ? m_RectTransform :
            GetComponent<RectTransform>() is
                { } foundRect ? m_RectTransform = foundRect : null;

        private Vector2 m_RectUVSize;

        private Matrix4x4 m_WorldCanvasMatrix = Matrix4x4.identity;
        private Matrix4x4 m_OverlayCanvasMatrix = Matrix4x4.identity;

        internal readonly RectProperties m_RectProperties = new RectProperties();

        [Serializable]
        internal class RectProperties
        {
            public Vector3 pos;
            public Vector3 rotation;
            public Vector2 size;
            public Vector2 pivot;
            public Vector2 scale;
            public Transform parent;
            public int childCount;
            public float scaleFactor = 1;
            public bool gamma2linear;

            public bool HasChange(Canvas canvas, RectTransform rect)
            {
                if (canvas)
                {
                    gamma2linear = canvas.vertexColorAlwaysGammaSpace;
                    if (!Mathf.Approximately(canvas.scaleFactor, scaleFactor))
                    {
                        scaleFactor = canvas.scaleFactor;
                        return true;
                    }
                }

                var transformChanged =
                    pos != rect.position ||
                    pivot != rect.pivot ||
                    rotation != rect.eulerAngles ||
                    parent != rect.parent ||
                    childCount != rect.childCount ||
                    size != rect.sizeDelta ||
                    scale != (Vector2)rect.lossyScale;

                if (!transformChanged)
                    return false;

                UpdateValues(rect);
                return true;
            }

            private void UpdateValues(RectTransform rect)
            {
                parent = rect.parent;
                rotation = rect.eulerAngles;
                pos = rect.position;
                size = rect.sizeDelta;
                pivot = rect.pivot;
                scale = rect.lossyScale;
                childCount = rect.childCount;
            }
        }

        internal delegate void OnBeginContextRendering(List<Camera> cameras);

        internal OnBeginContextRendering m_OnBeginContextRendering;

        internal delegate void DuringPreCullCamera(Camera cam);

        internal DuringPreCullCamera m_DuringCameraPreRender;

        internal void OnEnable()
        {
            CheckCurrentRenderPipeline(GraphicsSettings.defaultRenderPipeline);
#if UNITY_2021_3
            RenderPipelineManager.activeRenderPipelineTypeChanged += RenderPipelineTypeChanged;
#else
            RenderPipelineManager.activeRenderPipelineAssetChanged += RenderPipelineAssetChanged;
#endif
        }

        internal void OnDisable()
        {
#if UNITY_2021_3
            RenderPipelineManager.activeRenderPipelineTypeChanged -= RenderPipelineTypeChanged;
#else
            RenderPipelineManager.activeRenderPipelineAssetChanged -= RenderPipelineAssetChanged;
#endif
            m_OnBeginContextRendering = null;
            m_DuringCameraPreRender = null;
            RenderPipelineManager.beginContextRendering -= BeginContextRendering;
            Camera.onPreRender -= OnCameraPreRender;
        }

#if UNITY_2021_3
        private void RenderPipelineTypeChanged()
        {
            CheckCurrentRenderPipeline(RenderPipelineManager.currentPipeline != null);
        }
#else
        private void RenderPipelineAssetChanged(RenderPipelineAsset from, RenderPipelineAsset to)
        {
            CheckCurrentRenderPipeline(to);
        }
#endif

        private void CheckCurrentRenderPipeline(bool hasRenderPipeline)
        {
            if (hasRenderPipeline)
            {
                Camera.onPreRender -= OnCameraPreRender;
                RenderPipelineManager.beginContextRendering += BeginContextRendering;
            }
            else
            {
                RenderPipelineManager.beginContextRendering -= BeginContextRendering;
                Camera.onPreRender += OnCameraPreRender;
            }
#if UNITY_EDITOR
            //Repaint game and scene views
            var gameViewType = Type.GetType("UnityEditor.GameView,UnityEditor");
            var windows = Resources.FindObjectsOfTypeAll<EditorWindow>();
            foreach (var window in windows)
                if (window.GetType() == typeof(SceneView) || gameViewType != null && window.GetType() == gameViewType)
                    window.Repaint();
#endif
        }

        private void BeginContextRendering(ScriptableRenderContext context, List<Camera> cameras)
        {
            m_OnBeginContextRendering?.Invoke(cameras);
        }

        private void OnCameraPreRender(Camera cam)
        {
            m_DuringCameraPreRender?.Invoke(cam);
        }

        private void UpdateWorldRectParams(RectTransform targetRectTransform)
        {
            if (canvasTransform is not { } canvasRectTransform)
                return;

            var rect = targetRectTransform.rect;

            var rectSize = rect.size;

            m_RectUVSize.x = rectSize.x;
            m_RectUVSize.y = rectSize.y;

            m_WorldCanvasMatrix = Matrix4x4.TRS(
                targetRectTransform.TransformPoint(new Vector3(rect.x, rect.y, 0f)),
                targetRectTransform.rotation,
                targetRectTransform.lossyScale).inverse;

            if (canvas is { renderMode: RenderMode.ScreenSpaceOverlay })
                m_OverlayCanvasMatrix = m_WorldCanvasMatrix * canvasRectTransform.localToWorldMatrix;
        }

        /// <summary>
        /// Return true if rectUV has changed.
        /// </summary>
        /// <param name="overrideTransform">Override transform to decouple RectUV.</param>
        /// <returns></returns>
        protected bool HasChangedRectUV(RectTransform overrideTransform = null)
        {
            var targetRect = overrideTransform ?? rectTransform;

            if (!m_RectProperties.HasChange(canvas, targetRect))
                return false;

            UpdateWorldRectParams(targetRect);
            return true;
        }

        /// <summary>
        /// Set material rect params;
        /// </summary>
        /// <param name="material"></param>
        protected void SetMaterialRectParams(Material material)
        {
            material.SetVector(s_RectUvSizeID, m_RectUVSize);
            material.SetMatrix(s_WorldCanvasMatrixID, m_WorldCanvasMatrix);
            material.SetMatrix(s_OverlayCanvasMatrixID, m_OverlayCanvasMatrix);
        }
    }
}